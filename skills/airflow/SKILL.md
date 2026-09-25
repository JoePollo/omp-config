---
name: airflow
description: Apache Airflow 3 on Astronomer Astro knowledge base (DAG authoring, parse-time rules, tasks, Astro projects and deploys, Databricks orchestration). Routed by rule://domain-router.
hide: true
---
# Airflow on Astro KB
Defaults only: explicit instructions, AGENTS.md, repo config/conventions win; skill://databricks-platform owns Databricks-side design and skill://python owns general Python style. Read every topic whose trigger matches. Tags → skill://airflow/sources.md.

## Topics
| trigger | read |
|---|---|
| DAG definition, `airflow.sdk` imports, `@dag`/`@task`, operators, schedules, timetables, `start_date`, `catchup`, params, Jinja templates, context keys, trigger rules, branching, task groups, setup/teardown, assets, cross-DAG triggers, callbacks, notifiers, Deadline Alerts, Airflow 2 → 3 migration | skill://airflow/authoring.md |
| module-level code in `dags/`, imports in DAG files, `Variable.get`, dynamic DAG generation, `.airflowignore`, DAG folder layout, import errors, parse time, dag processor settings | skill://airflow/parsing.md |
| idempotency, run slices, retries, timeouts, XCom, object storage, dynamic task mapping, deferrable or async tasks, sensors, pools, concurrency, priority, worker queues, virtualenv/KPO isolation, metadata DB access | skill://airflow/tasks.md |
| `Dockerfile`, Runtime image/version, `requirements.txt`, `packages.txt`, providers, `include/`, `plugins/`, `.astro/`, `.env`, `airflow_settings.yaml`, astro CLI (`astro dev …`), Runtime upgrades, rollback | skill://airflow/astro-project.md |
| `astro deploy`, DAG-only vs image deploys, CI/CD pipelines, API tokens, Deployment env vars, `AIRFLOW__*` overrides, connections, variables, secrets backend, Key Vault, workload identity, executors, worker queues, scheduler size, alerts, logs, Airflow REST API | skill://airflow/astro-deploy.md |
| `tests/`, DAG integrity tests, `astro dev parse`/`astro dev pytest`, `dag.test()`, `airflow dags test`, mocking connections/variables, ruff `AIR` rules | skill://airflow/testing.md |
| Databricks jobs, pipelines, or SQL from Airflow; `apache-airflow-providers-databricks`; `databricks` connection | skill://airflow/databricks.md |

## Core
- Target Astro Runtime `3.2-6` = Airflow 3.2.2, Python 3.13 (3.12–3.14 supported); anything documented as 3.3+ is unavailable. In an Astro project read `Dockerfile` (Runtime tag), `requirements.txt` (provider pins), `tests/`, and the CI pipeline first — they win over this KB. [RT:runtime-release-notes, CLI:develop-project, U]
- Author against `airflow.sdk` and provider modules only; never Airflow 2 paths (`airflow.models.DAG`, `airflow.decorators`, `airflow.operators.*`) or removed arguments. [AF:public-airflow-interface, AF:installation/upgrading_to_airflow3]
- DAG files are configuration re-parsed at least every 30 s: module level builds DAG objects from static values; I/O, Variable/Connection lookups, hook construction, and heavy imports belong inside task callables. [AF:best-practices, LEARN:dag-best-practices]
- No runtime-varying values (`now()`, `uuid4()`, random) in DAG or task constructor arguments: every parse would create a new DAG version. [RUFF:airflow3-dag-dynamic-value]
- Tasks are idempotent, atomic transactions over their run's slice (`data_interval_start`/`data_interval_end` or `logical_date`): UPSERT or overwrite a partition; never "latest" data or wall-clock `now()`. [AF:best-practices, LEARN:dag-best-practices]
- Airflow orchestrates, Databricks computes: no heavy processing on workers; XCom carries small JSON (ids, paths, counts); data moves through storage. [LEARN:dag-best-practices, AF:core-concepts/xcoms]
- No metadata database access from task or trigger code; use the task context, `airflow.sdk`, or REST API `/api/v2`. [AF:installation/upgrading_to_airflow3]
- One codebase for dev/tst/prd: environment values come from Deployment env vars (`ENVIRONMENT`, `AIRFLOW_VAR_*`) and connections; no environment literals. [AF:best-practices, U]
- Secrets live in connections, secret env vars, or a secrets backend; never in DAG code, params, XCom, asset URIs, or logs. [AF:authoring-and-scheduling/assets, LEARN:airflow-params, LEARN:airflow-variables, ASTRO:environment-variables]
- Waits longer than a few minutes: deferrable operators (`deferrable=True`) or sensors with `mode="reschedule"`; never a long `poke`. [AF:authoring-and-scheduling/deferring, LEARN:deferrable-operators]
- Data dependencies between DAGs use assets; `TriggerDagRunOperator` for explicit control; `ExternalTaskSensor` last. [LEARN:cross-dag-dependencies, LEARN:airflow-datasets]
- Ship only through CI/CD with an API token: DAG-only deploy when only `dags/` changed, image deploy otherwise; `astro dev parse` and `astro dev pytest` pass first. [ASTRO:deploy-dags, ASTRO:set-up-ci-cd, CLI:astro-dev-parse, U]
- Airflow, Astro, and Databricks are read-only for agents: never trigger, pause, unpause, clear, delete, or deploy without explicit permission. [U]
- Python style: skill://python; DAG files override it only for parse time (heavy imports inside tasks); task callables validate `params`/XCom input into models and push `model.model_dump(mode="json")`. [U, AF:best-practices]

## Diagnose (read-only)
Airflow MCP servers `airflow-dev`, `airflow-tst`, `airflow-prd` (`astro-airflow-mcp`, `AF_READ_ONLY=true`); "connection refused" to `localhost:8080` means that server's API URL is blank → use the local commands. [U]

| question | tool / command |
|---|---|
| DAG missing, import broken | MCP `list_import_errors`, `list_dag_warnings`, `get_system_health`; local `astro dev parse`, `astro dev run dags list-import-errors` |
| why a run failed | MCP `diagnose_dag_run` → `get_task_logs`, `get_task_instance` |
| DAG shape, code, settings | MCP `explore_dag`, `get_dag_details`, `get_dag_source`, `list_tasks`, `get_task` |
| run history, success rate | MCP `list_dag_runs`, `get_dag_run`, `get_dag_stats` |
| queued or starved tasks | MCP `list_pools`, `get_pool`; Astro health incident "worker queue at capacity" |
| assets, lineage | MCP `list_assets`, `list_asset_events`, `get_upstream_asset_events` |
| versions, providers, config | MCP `get_airflow_version`, `list_providers`, `get_airflow_config`; local `astro dev bash pip freeze` |
| connections, variables | MCP `list_connections`, `list_variables`, `get_variable`; never echo secret values |
| parse load, component logs | Astro UI component logs (dag processor, scheduler, triggerer, workers; last 24 h); local `astro dev logs --dag-processor` |

Never without explicit permission: MCP `trigger_dag`, `trigger_dag_and_wait`, `pause_dag`, `unpause_dag`, `clear_dag_run`, `clear_task_instances`, `delete_dag_run`; `astro deploy`; Astro or Terraform changes. [U]

[U, CLI:astro-dev-parse, CLI:astro-dev-run, CLI:astro-dev-logs, CLI:astro-dev-bash, ASTRO:view-logs, ASTRO:deployment-health-incidents]

## Local platform (observed 2026-09-25; repo config wins)
- One `DEDICATED` Astro Deployment per environment on Azure `centralus` (cluster `beginner_cluster`): `dev-Data-Platform-Pipelines`, `tst-Data-Platform-Pipelines`, `prd-Data-Platform-Pipelines`; dev feature branches get `<branch>_ephemeral_feature_deployment`. [U]
- Executor `ASTRO`; CI/CD enforced; DAG-only deploys enabled; task pod default 0.25 CPU / 0.5Gi. [U]
- Scheduler: dev `SMALL` (development mode), tst `MEDIUM`, prd `MEDIUM` with high availability; quota 10 CPU / 20Gi. [U]
- Worker queues (all envs): `default` `A5`, max 5 workers, concurrency 5 (min 0 dev/tst, 1 prd); `els-workers` `A10`, min 0, max 3, concurrency 3. [U]
- The `astro-tf-platform` Terraform owns Deployment settings and env vars: change them there, never in the Astro UI (the next apply reverts UI edits). The running Runtime comes from the DAG repo's `Dockerfile`; Terraform's `original_astro_runtime_version` only seeds Deployment creation. [U, TFA]
- Deployment env vars: `ENVIRONMENT` and `AIRFLOW_VAR_ENVIRONMENT` (`dev`|`tst`|`prd`), `AIRFLOW_VAR_UC_AUDIT_TABLE_REF`, `AIRFLOW_VAR_ELS_PSG_ILS_QUEUE_URI`, `AIRFLOW_VAR_ELS_GFS_ILS_QUEUE_URI`, `AIRFLOW_VAR_ELS_GFS_ANC_QUEUE_URI`, `AIRFLOW_VAR_ILS_SYSTEM_READINESS_ENABLED`, `AIRFLOW_VAR_PSG_ILS_SYSTEM_READINESS_ENABLED`, `AIRFLOW_VAR_NJS_SCHEDULE_OVERRIDE`, `DATABRICKS_WORKSPACE_URL`, `DATABRICKS_SQL_HTTP_PATH`, `DATABRICKS_CLIENT_ID`, secret `DATABRICKS_CLIENT_SECRET`, `ILS_CONNECTION_STRING`. [U]
- Workload identity = Azure UAI `id-gfs-astro-<env>-centralus-01`; connection `azure_<env>_managed_identity` (env var `AIRFLOW_CONN_AZURE_<ENV>_MANAGED_IDENTITY`: conn type `azure`, `managed_identity_client_id` + `workload_identity_tenant_id`); Azure roles `Key Vault Secrets User` (Astro resource group) and `Storage Queue Data Message Sender` (ELS resource group); Databricks principal `orchestration_mi`. [U]
- Alerts: Astro DAG and task alerts (PagerDuty, email) for tst and prd are Terraform-managed. [U]
- CI: Azure DevOps; feature-preview pipelines create and delete branch Deployments, and images ship through a separate image-deploy pipeline; pipelines pin the Astro CLI version. [U]
