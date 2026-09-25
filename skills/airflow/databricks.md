# Orchestrating Databricks from Airflow
Tags → skill://airflow/sources.md. Databricks-side design (pipelines, tables, bundle): skill://databricks-platform.

## Ownership
- Jobs, pipelines, and compute are defined and deployed by the Databricks `data_platform` bundle, which leaves scheduling to the orchestrator; DAGs only trigger and monitor them. No `new_cluster`, `DatabricksWorkflowTaskGroup`, or `DatabricksCreateJobsOperator` in DAGs unless asked. [U]
- `apache-airflow-providers-databricks` is not in Runtime: pin it in `requirements.txt`; stable docs are 7.20.0 → check the pinned version's docs before using newer arguments. [RT:runtime-provider-reference, PRV:databricks/index]

## Triggering
- Bundle job: `DatabricksRunNowOperator(task_id="...", databricks_conn_id="...", job_name="<job name>", job_parameters={...}, deferrable=True)` from `airflow.providers.databricks.operators.databricks`; `job_name` must match exactly one job; `wait_for_termination` defaults True (polls every 30 s); `repair_run=True` repairs a failed run; `cancel_previous_runs=True` cancels active runs first. [PRV:databricks/operators/run_now]
- Lakeflow pipeline update (no dedicated operator): `DatabricksSubmitRunOperator(task_id="...", pipeline_task={"pipeline_id": "<id>"}, deferrable=True)`; pipeline ids differ per workspace → read them from per-environment config (`{{ var.value.<key> }}` backed by `AIRFLOW_VAR_*`), never literals. [PRV:databricks/operators/submit_run, U]
- SQL: `DatabricksSqlOperator` (`airflow.providers.databricks.operators.databricks_sql`; warehouse via `http_path` or `sql_endpoint_name`) or deferrable `DatabricksSQLStatementsOperator`; `DatabricksStartWarehouseOperator`/`DatabricksStopWarehouseOperator` start or stop an existing warehouse. [PRV:databricks/operators/sql, PRV:databricks/operators/sql_statements, PRV:databricks/operators/warehouse]
- Deferrable: RunNow, SubmitRun, Notebook, Task, SQLStatements, warehouse start/stop; `DatabricksSqlSensor` and `DatabricksPartitionSensor` can't defer → `mode="reschedule"`. [PRV:databricks/operators/index]
- Pass the run's slice explicitly in `job_parameters` (data-interval timetables: `{{ data_interval_start }}`, `{{ data_interval_end }}`) so reruns reprocess the same window. [AF:best-practices]
- Retries: provider API retries (`databricks_retry_limit` 3, `databricks_retry_delay` 1 s, exponential) absorb transient API errors; task `retries` rerun the operator; `durable` needs Airflow 3.3+ and is ignored on 3.2.2. [PRV:databricks/operators/run_now]

## Connection and identity
- Conn type `databricks` (default id `databricks_default`), `host` = workspace URL (`DATABRICKS_WORKSPACE_URL` on this platform). [PRV:databricks/connections/databricks, U]
- Auth: managed identity (`extra.use_azure_managed_identity: true`, `azure_managed_identity_client_id` for a user-assigned identity; `azure_resource_id` only when the identity isn't a workspace user) or `use_default_azure_credential` (never both); Azure service principal (`login` = client id, `password` = secret, `extra.azure_tenant_id`); Databricks OAuth M2M (`extra.service_principal_oauth: true`, `login` = client id, `password` = OAuth secret); PAT in `password`. [PRV:databricks/connections/databricks]
- Prefer the Deployment's workload identity over stored secrets. [ASTRO:authorize-deployments-to-your-cloud]
- Platform: workload identity `id-gfs-astro-<env>-centralus-01` is Databricks principal `orchestration_mi` (workspace user; `CAN_MANAGE` on data_platform pipelines; `CAN_USE` on SQL warehouses); `DATABRICKS_CLIENT_ID` holds its client id and secret `DATABRICKS_CLIENT_SECRET` a Databricks OAuth secret. Reuse the DAG repo's existing Databricks connection; permission changes go through Databricks-IaC or the bundle, never ad hoc. [U]
