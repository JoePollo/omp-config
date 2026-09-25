# Astro deploys and Deployment config
Tags → skill://airflow/sources.md.

## Deploy types
- DAG-only deploy (`astro deploy <deployment-id> --dags`): replaces the whole deployed `dags/` bundle (not incremental), no restart, running tasks unaffected, no pytest unless `--pytest`. [ASTRO:deploy-dags]
- Image deploy (`astro deploy <deployment-id>`): builds everything outside `dags/` (Dockerfile, requirements, packages, `include/`, `plugins/`) and ships DAGs too; restarts components; running tasks get up to 24 h on old workers. Required for every non-`dags/` change and Runtime upgrades. [ASTRO:deploy-code, ASTRO:deploy-project-image, ASTRO:deploy-dags]
- `astro deploy` parses DAGs by default (`--pytest` also gates on `tests/`); `--force` bypasses failed checks and `skip_parse: true` / `ASTRONOMER_SKIP_PARSE=true` skip parsing — neither in CI. [CLI:astro-deploy, ASTRO:deploy-project-image]
- Toggling DAG-only deploys requires CI/CD enforcement off, then an immediate full `astro deploy` (DAGs disappear otherwise). [ASTRO:deploy-dags]
- Hosted auto-configures a versioned DAG bundle: each run keeps the DAG version it started with. [ASTRO:dag-versioning, AF:administration-and-deployment/dag-bundles]

## CI/CD
- CI/CD enforcement (on for this platform) allows deploys only with a Deployment, Workspace, or Organization API token in `ASTRO_API_TOKEN`; no workstation deploys. [ASTRO:set-up-ci-cd, ASTRO:automation-authentication, U]
- Deploy step: only `dags/` changed → `astro deploy <deployment-id> --dags`; anything else → `astro deploy <deployment-id>`. Astronomer's Azure DevOps sample is image-only and single-branch (`trigger: - main`, `pr: none`, CLI via `curl -sSL install.astronomer.io | sudo bash -s`, `astro deploy ${ASTRO_DEPLOYMENT_ID}` with `ASTRO_API_TOKEN` as a secret variable). [ASTRO:ci-cd-templates/template-overview, ASTRO:ci-cd-templates/azure-devops]
- Tokens: least privilege, expiry, rotation, secret CI variables; a Deployment token acts as Workspace Operator on one Deployment (deploys and Airflow REST API). [ASTRO:automation-authentication, ASTRO:deployment-api-tokens]
- Branch previews: ephemeral Deployments per feature branch, deleted with the branch (this platform: `<branch>_ephemeral_feature_deployment` via the feature-preview pipelines). [ASTRO:best-practices/manage-dev-deployments, U]
- Git submodules must be fetched before `astro deploy`. [ASTRO:best-practices/git-submodules]

## Environment variables and Airflow config
- Airflow config overrides are Deployment env vars `AIRFLOW__<SECTION>__<KEY>`; priority Deployment > Workspace Environment Manager > Dockerfile `ENV`; `.env` is local only (`astro deployment variable create --load` adds keys, `update --load` overwrites all). [ASTRO:environment-variables, ASTRO:manage-env-vars]
- Saving Deployment env vars restarts components (up to about 2 min). [ASTRO:environment-variables, ASTRO:manage-env-vars]
- Secrets: mark env vars secret (hidden, stored as Kubernetes secrets); code that prints them still leaks them to task logs; Dockerfile `ENV` is plaintext and invisible in the Astro UI → no secrets there. [ASTRO:environment-variables, ASTRO:create-and-link-environment-variables, ASTRO:manage-env-vars]
- Platform-owned keys (`AIRFLOW__CORE__EXECUTOR`, `AIRFLOW__DATABASE__SQL_ALCHEMY_CONN`, `AIRFLOW__CORE__FERNET_KEY`, `AIRFLOW__API__BASE_URL`, `AIRFLOW__KUBERNETES__NAMESPACE`, `AIRFLOW__LOGGING__REMOTE_*`, `AIRFLOW__METRICS__STATSD_*`, `AIRFLOW_HOME`, …): the UI doesn't block them; check Astro's global variable table before overriding any platform key. [ASTRO:platform-variables]
- This platform's Deployment env vars are Terraform-managed (`astro-tf-platform` repo): change them there; UI edits are reverted on the next apply. [U, TFA]

## Connections, variables, secrets
- Lookup order on Astro: secrets backend → Astro Environment Manager → environment variables (`AIRFLOW_CONN_*`, `AIRFLOW_VAR_*`) → metadata DB; not configurable. [ASTRO:secrets-backend, ASTRO:manage-connections-variables, AF:security/secrets/secrets-backend/index]
- `AIRFLOW_CONN_<CONN_ID>` accepts URI or JSON; env-defined connections and Environment Manager objects don't appear in the Airflow UI lists. [LEARN:connections, ASTRO:manage-connections-variables]
- Environment Manager shares one connection id across Deployments with per-Deployment field overrides, so the same DAG code promotes dev → prd. [ASTRO:create-and-link-connections, ASTRO:best-practices/connections-branch-deploys]
- Azure Key Vault backend: add `apache-airflow-providers-microsoft-azure`; `AIRFLOW__SECRETS__BACKEND=airflow.providers.microsoft.azure.secrets.key_vault.AzureKeyVaultBackend`; secret `AIRFLOW__SECRETS__BACKEND_KWARGS` JSON with `vault_url`, `connections_prefix` (`airflow-connections`), `variables_prefix` (`airflow-variables`), `config_prefix` (`airflow-config`), `sep` (`-`), plus workload identity `managed_identity_client_id` + `workload_identity_tenant_id` (or service principal `tenant_id`/`client_id`/`client_secret`); a `null` prefix disables that lookup. [ASTRO:secrets-backend/azure-key-vault, PRV:microsoft-azure/secrets-backends/azure-key-vault]
- Key Vault names: `conn_id` `smtp_default` → secret `airflow-connections-smtp-default` (underscores become `sep`); connection secrets hold a URI, not JSON; variables are `airflow-variables-<key>`. [PRV:microsoft-azure/secrets-backends/azure-key-vault]
- Prefer workload identity over stored secrets: the Deployment's Kubernetes service account authenticates to Azure; grant Azure RBAC to that identity. [ASTRO:authorize-deployments-to-your-cloud]
- Env-backed variables (`AIRFLOW_VAR_<KEY>`) read via `Variable.get("<key>")` or `{{ var.value.<key> }}`; never `os.getenv` for secrets (values can reach logs). [LEARN:airflow-variables]

## Executors, queues, resources
- Astro executor: default and Airflow 3 only; agents pull work from the API server; queue workers autoscale (KEDA every 10 s, scale-down 5 min after the last task). Celery and Kubernetes executors remain options. [ASTRO:executors-overview, ASTRO:astro-executor]
- Per queue: worker type, min/max workers, concurrency; the `default` queue is mandatory and can't be renamed. [ASTRO:configure-worker-queues]
- Scheduler size: Small ~50 DAGs, Medium ~250, Large ~1,000, Extra Large ~2,000; production Medium or larger with high availability. [ASTRO:deployment-resources]
- Airflow 3 API server: 2 replicas by default, autoscaling up to 10. [ASTRO:deployment-resources, ASTRO:api-server-autoscaling]
- Right-size from Deployment analytics (last 7 days) against min/max thresholds such as 50%/75%. [ASTRO:best-practices/rightsize-airflow-on-astro]
- Unsupported on Astro: Edge executor, Airflow 3 multi-team, custom auth managers. [ASTRO:airflow-feature-support]

## Alerts, logs, API
- Astro alerts (DAG Failure/Success/Timeliness/Duration, Task Failure/Duration → email, PagerDuty, Slack, Opsgenie, DAG trigger) cover no-code DAG-level signals; Airflow callbacks and notifiers cover custom task-level logic. [ASTRO:alerts, ASTRO:best-practices/airflow-vs-astro-alerts]
- Health incidents: scheduler heartbeat missing > 10 min, metadata tables > 50/75 GiB, deprecated Runtime, scheduling disabled, worker queue at capacity. [ASTRO:deployment-health-incidents]
- Logs: Astro UI component logs (dag processor, scheduler, triggerer, workers, API server) for the past 24 h; task logs kept 90 days. [ASTRO:view-logs]
- REST API: `https://<deployment-url>/api/v2/...` with `Authorization: Bearer <API token>`; URL via `astro deployment inspect -n <name> --key metadata.airflow_api_url`. [ASTRO:airflow-api]
- Cross-Deployment dependencies: an Astro alert with a DAG-trigger channel, or asset events posted through the REST API (`/api/v2`; older `/api/v1` examples don't apply). [ASTRO:best-practices/cross-deployment-dependencies, ASTRO:airflow-api]
