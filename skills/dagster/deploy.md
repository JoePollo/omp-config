# Deploying and operating Dagster

Tags → skill://dagster/sources.md. The implementation is self-hosted on AWS; its Dagster product mode and AWS services are unspecified. Inspect repository deployment config before applying product- or service-specific guidance. The AKS/Azure hosting and infrastructure details below are reference only, not the AWS deployment profile. [U]

## Shared

- Images: multi-stage `uv` build with runtime dependencies only (`uv sync --no-dev`), tagged with the commit SHA; deployments reference that immutable tag, never a branch tag. [DG:examples/full-pipelines/dagster-plus-deployment/containerize, DG:deployment/dagster-plus/deploying-code/configuring-ci-cd]
- Promotion dev → tst → prd through Azure DevOps pipelines, one Dagster deployment per environment; no workstation deploys. [U, DG:examples/full-pipelines/dagster-plus-deployment/cicd]
- Kubernetes deployments: size run concurrency from measured run shapes (run pod plus step pods), cluster-allocatable CPU and memory, and provider quotas; keep Dagster queue limits below that envelope. [BLOG:the-data-plane-is-yours-dagster-hybrid-on-kubernetes-and-azure]
- For Kubernetes runs, a Kubernetes Job retry is not a Dagster run retry; Dagster owns run retry policy. [BLOG:the-data-plane-is-yours-dagster-hybrid-on-kubernetes-and-azure]
- Upgrades: read the upgrade guide for each minor; move core 1.13.x and libraries 0.29.x together at matching patch levels. [DG:migration/upgrading, DG:about/releases]

## Dagster+ Hybrid on AKS (Azure reference only)

- Dagster+ hosts the UI, GraphQL API, metadata, and daemons; the agent, code servers, and run pods run in AKS with outbound-only connections to Dagster+. [DG:deployment/dagster-plus/hybrid/architecture]
- Agent: Helm chart `dagster-cloud/dagster-cloud-agent`; agent token in a Kubernetes Secret (`DAGSTER_CLOUD_AGENT_TOKEN`), or from Key Vault through CSI with chart 1.10.2+ (`dagsterCloud.agentTokenSecretName`); run-pod settings go under `workspace`, never the OSS `runLauncher` key. [DG:deployment/dagster-plus/hybrid/kubernetes/setup, DG:deployment/dagster-plus/hybrid/azure/key-vault, DG:examples/full-pipelines/dagster-plus-deployment/kubernetes-agents]
- Upgrade the agent before any code location adopts a newer Dagster, and at least every six months; a separate agent serves branch deployments (`dagsterCloud.branchDeployments: true`). [BLOG:the-data-plane-is-yours-dagster-hybrid-on-kubernetes-and-azure, DG:deployment/dagster-plus/hybrid/kubernetes/setup]
- Images live in ACR attached to AKS (`az aks update --attach-acr`); compute logs go to Blob or ADLS through `AzureBlobComputeLogManager` with workload identity (`Storage Blob Data Contributor`). [DG:deployment/dagster-plus/hybrid/azure/acr-user-code, DG:deployment/dagster-plus/hybrid/azure/blob-compute-logs]
- New `dg` projects: `build.yaml` (`registry`, `directory`), `container_context.yaml` (`env_vars`, `k8s`, `k8s.env_secrets`), `[tool.dg.project]` in `pyproject.toml`; `dagster_cloud.yaml` only where it already exists. [DG:deployment/dagster-plus/management/build-yaml, SK:references/deployment/config-files.md]
- CI: `dagster-cloud` in the runtime image, `dagster-dg-cli` as a dev dependency, `DAGSTER_CLOUD_API_TOKEN` as a secret pipeline variable; `dg plus deploy configure` scaffolds only GitHub or GitLab, so Azure DevOps runs the documented non-interactive `dg plus deploy` steps; `dg plus deploy start` replaces `dagster-cloud ci check`. [DG:deployment/dagster-plus/deploying-code/configuring-ci-cd, DG:about/changelog]
- Branch deployments per pull request against isolated data; full deployments for dev, tst, prd; the Dagster+ Terraform provider (`dagster-io/dagsterplus` `~> 0.1`) is early-access preview. [DG:deployment/dagster-plus/deploying-code/branch-deployments, DG:deployment/dagster-plus/deploying-code/full-deployments, DG:deployment/dagster-plus/management/terraform]
- Code-location snapshots stay under 130 MB; `DAGSTER_REDACT_USER_CODE_ERRORS=1` masks user-code errors in the UI; production runs are isolated. [DG:deployment/dagster-plus/management/snapshot-size-limits, DG:deployment/dagster-plus/management/managing-compute-logs-and-error-messages, DG:deployment/dagster-plus/run-isolation]

## OSS on Kubernetes (only if the self-hosted AWS runtime uses Kubernetes)

- Services: `dagster-webserver` (replicas allowed), `dagster-daemon` (schedules, sensors, run queue, monitoring), and one code server per code location; instance config in `$DAGSTER_HOME/dagster.yaml`. [DG:deployment/oss/oss-deployment-architecture, DG:deployment/execution/dagster-daemon]
- Storage: PostgreSQL (`dagster-postgres`, database in UTC) under `storage.postgres` with `env:` values; an external database uses `postgresql.enabled: false` and `global.postgresqlSecretName`. [DG:deployment/oss/oss-instance-configuration, DG:deployment/oss/dagster-yaml, DG:deployment/oss/deployment-options/kubernetes/customizing-your-deployment]
- Charts from `https://dagster-io.github.io/helm`: `dagster` (system) and `dagster-user-deployments` (code locations) as separate releases, so code ships independently. [DG:deployment/oss/deployment-options/kubernetes/deploying-to-kubernetes, DG:deployment/oss/deployment-options/kubernetes/customizing-your-deployment]
- Runs are Kubernetes Jobs through `K8sRunLauncher`; defaults in `runLauncher.config.k8sRunLauncher.runK8sConfig`, per-job overrides with the `dagster-k8s/config` tag; `k8s_job_executor` step pods need `step_k8s_config`. [DG:deployment/execution/run-launchers, DG:deployment/oss/deployment-options/kubernetes/customizing-your-deployment]
- The queued run coordinator is the default since 1.10 and needs the daemon; turn on `run_monitoring.enabled: true` and `run_retries.enabled: true`. [DG:about/changelog, DG:deployment/execution/run-monitoring, DG:deployment/execution/run-retries]
- Minor upgrades: back up Postgres, scale webserver and daemon to 0, run the chart's migration Job (`migrate.enabled=true`), then restore. [DG:deployment/oss/deployment-options/kubernetes/migrating-while-upgrading]
- Database hygiene: routine `VACUUM`, never routine `VACUUM FULL`; grow storage before bulk cleanup. [DG:deployment/troubleshooting/database-tuning]
