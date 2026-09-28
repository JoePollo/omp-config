# Resources, configuration, and environments

Tags → skill://dagster/sources.md.

## Resources

- Every external system gets a `dg.ConfigurableResource` subclass: typed config fields plus methods that open the client; assets, checks, schedules, and sensors receive it through an annotated parameter. [DG:guides/build/external-resources/defining-resources, DG:guides/build/external-resources/using-resources]
- Bind resources in `dg.Definitions(resources={...})` returned by a `@dg.definitions` function; plain Python objects only through `dg.ResourceParam`. [DG:guides/build/external-resources/defining-resources, DG:guides/build/external-resources]
- Nested resources are typed fields on the parent (`dg.ResourceDependency[...]`); a child built at module scope and returned from a method is unmanaged and its `EnvVar`s never resolve. [DG:guides/build/external-resources/configuring-resources, DG:guides/operate/configuration/using-environment-variables-and-secrets]
- Per-run state: `setup_for_execution`/`teardown_after_execution` (once per run per process) with `PrivateAttr` fields named `_…`; open clients in context managers. [DG:guides/build/external-resources/managing-resource-state, DG:guides/build/external-resources/connecting-to-databases]
- `dg.Config` and `dg.ConfigurableResource` are Pydantic models: they are the typed records skill://python requires for run parameters and connection settings. [DG:guides/operate/configuration/run-configuration, DG:guides/build/external-resources/managing-resource-state, U]
- Caches live in the resource: `functools.lru_cache` is per process; runs on separate pods need a shared cache. [DG:examples/best-practices/resource-caching]
- `configure_at_launch()` only for fields callers must set per run. [DG:guides/build/external-resources/configuring-resources]

## Environment variables and secrets

- Secret or environment-specific fields take `dg.EnvVar("NAME")` (`dg.EnvVar.int(...)` for integers): resolved at run launch and hidden in the UI; `os.getenv()` during load shows the value in the UI and is only for non-secret selection. [DG:guides/operate/configuration/using-environment-variables-and-secrets, DG:guides/build/external-resources/configuring-resources]
- No passwords, tokens, keys, or connection strings in code, YAML, run config, tags, metadata, or logs. [DG:guides/operate/configuration/using-environment-variables-and-secrets, U]
- Local values: a project-root `.env` (loaded by `dg`) that is never committed, plus a committed `.env.example` naming the required variables; `dg list envs` shows what components need. [SK:references/env-vars.md, DG:api/clis/dg-cli/dg-cli-reference]
- Dagster+: variables set in the UI, scoped per deployment and code location (UI values beat agent config), or per code location in `container_context.yaml`; built-ins `DAGSTER_CLOUD_DEPLOYMENT_NAME`, `DAGSTER_CLOUD_IS_BRANCH_DEPLOYMENT` (`"1"`). [DG:deployment/dagster-plus/management/environment-variables, DG:deployment/dagster-plus/management/environment-variables/agent-config, DG:deployment/dagster-plus/management/environment-variables/built-in]
- AKS: secrets come from Key Vault through the Secrets Store CSI provider with workload identity (`Key Vault Secrets User`). [DG:deployment/dagster-plus/hybrid/azure/key-vault]

## Environments (dev/tst/prd)

- One Dagster deployment per environment (Dagster+ full deployments or one OSS instance each); code reads the environment from a deployment-set variable (`DAGSTER_CLOUD_DEPLOYMENT_NAME` on Dagster+, `ENVIRONMENT` = `dev`|`tst`|`prd` on OSS) and everything else from resource `EnvVar`s. [U, DG:examples/full-pipelines/dagster-plus-deployment/define-assets]
- Catalog names derive from the environment (`f"dwh_{environment}.silver.orders"`); hosts and IDs come from `EnvVar`s. [U]
- Upstream examples say staging/prod: map them to tst/prd; local files are `.env` and `.env.<dev|tst|prd>` (`dg launch --env-file`). [SK:references/env-vars.md, U]
- Branch deployments write only to isolated targets with separate credentials, never production data. [DG:deployment/dagster-plus/deploying-code/branch-deployments/testing-against-prod-data]

## Run config vs partitions

- Partitions for discrete segments that need history, status, schedules, or backfills; `dg.Config` for ad-hoc or unbounded parameters; a partition key plus config for extra options. [DG:examples/best-practices/partitions-vs-config]
- Config classes subclass `dg.Config` and arrive as the `config` parameter; tests pass `dg.RunConfig` to `dg.materialize`. [DG:guides/operate/configuration/run-configuration]

## Azure, SQL Server, Teams

- Azure Storage: `ADLS2Resource` or `AzureBlobStorageResource` (`dagster-azure`) with the `default` credential type (`DefaultAzureCredential`, managed identity included) over SAS tokens or account keys; `ADLS2PickleIOManager` only for pickle-friendly outputs. [DG:integrations/libraries/azure, DG:integrations/libraries/azure/component, DG:integrations/libraries/azure/dagster-azure]
- SQL Server: no first-party integration; wrap the driver in a `dg.ConfigurableResource` with `dg.EnvVar` credentials; `dagster-mssql-bcp` is community-maintained. [DG:integrations/libraries/mssql-bulk-copy-tool, DG:guides/build/external-resources/connecting-to-databases]
- Microsoft Teams: `MSTeamsResource(hook_url=dg.EnvVar("TEAMS_WEBHOOK_URL"))`, `make_teams_on_run_failure_sensor(...)`, `teams_on_failure` hooks; `webserver_base_url` adds run links. [DG:integrations/libraries/msteams, DG:integrations/libraries/msteams/dagster-msteams]
