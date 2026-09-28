# Orchestrating Databricks from Dagster

Tags → skill://dagster/sources.md. Databricks-side design (pipelines, tables, bundle): skill://databricks-platform.

## Ownership

- The Databricks `data_platform` bundle defines and deploys jobs, pipelines, and compute; Dagster triggers deployed jobs and records their runs. No cluster specs, `jobs.submit`/`jobs.create`, `create_databricks_submit_run_op`, or Pipes one-time runs in Dagster code unless asked. [U, DG:integrations/libraries/databricks]
- The Databricks components are preview: `DatabricksWorkspaceComponent` (state-backed; one asset per task of discovered jobs; triggers and monitors job runs) and `DatabricksAssetBundleComponent` (assets from `databricks.yml` tasks; its execution call is undocumented) need explicit approval. [DG:integrations/libraries/databricks/databricks-workspace-component, DG:integrations/libraries/databricks/databricks-asset-bundle-component, DG:about/releases]

## Triggering bundle jobs

- An asset calls a `dg.ConfigurableResource` that resolves the job by exact name (`jobs.list(name=...)`, exactly one match) and runs it with `jobs.run_now_and_wait(job_id=..., job_parameters={...}, timeout=...)`; a failed run raises, failing the asset. [DG:integrations/libraries/databricks/pipes/serverless-compute, DBSDK:workspace/jobs/jobs]
- SDK waiters time out after 20 minutes by default: pass `timeout=` sized to the job. [DBSDK:workspace/jobs/jobs]
- Job IDs and hosts differ per workspace: resolve jobs by name at run time; hosts come from `dg.EnvVar("DATABRICKS_HOST")`. [U]
- Partitioned assets pass their slice as job parameters (`{"run_date": context.partition_key}`) and the job overwrites that slice. [DG:guides/build/partitions-and-backfills/backfilling-data, U]
- Record `databricks_run_id` in `dg.MaterializeResult` metadata and tag the asset `kinds={"databricks"}`. [DG:integrations/libraries/databricks/pipes/serverless-compute, DG:guides/build/assets/metadata-and-tags/kind-tags]
- Lakeflow pipelines: trigger the bundle job that runs them; without one, `pipelines.start_update(pipeline_id=...)` with the id from an `EnvVar`, then poll `pipelines.get_update(...)` until the update finishes. [U, DBSDK:workspace/pipelines/pipelines]
- Tables Databricks maintains without a Dagster trigger are `dg.AssetSpec`s reported by observation. [DG:guides/build/assets/external-assets, DG:guides/build/assets/metadata-and-tags/asset-observations]

```python
from datetime import timedelta

import dagster as dg
from databricks.sdk import WorkspaceClient


class DatabricksJobs(dg.ConfigurableResource):
    """Runs bundle-deployed Databricks jobs by name."""

    host: str
    timeout_minutes: int = 120

    def run(self, job_name: str, job_parameters: dict[str, str]) -> int:
        """Runs the single job named job_name, waits for it, and returns its run id."""
        workspace = WorkspaceClient(host=self.host)
        matches = list(workspace.jobs.list(name=job_name))
        if len(matches) != 1:
            raise dg.Failure(f"expected one Databricks job named {job_name}, found {len(matches)}", allow_retries=False)
        run = workspace.jobs.run_now_and_wait(
            job_id=matches[0].job_id,
            job_parameters=job_parameters,
            timeout=timedelta(minutes=self.timeout_minutes),
        )
        return run.run_id


@dg.asset(partitions_def=dg.DailyPartitionsDefinition(start_date="2026-01-01"), kinds={"databricks"})
def orders_daily(context: dg.AssetExecutionContext, databricks: DatabricksJobs) -> dg.MaterializeResult:
    """Daily orders, refreshed by the bundle job orders_refresh."""
    run_id = databricks.run("orders_refresh", {"run_date": context.partition_key})
    return dg.MaterializeResult(metadata={"databricks_run_id": run_id})


@dg.definitions
def resources() -> dg.Definitions:
    """Binds the Databricks resource for this code location."""
    return dg.Definitions(resources={"databricks": DatabricksJobs(host=dg.EnvVar("DATABRICKS_HOST"))})
```

## Connection and identity

- `WorkspaceClient` uses Databricks unified auth from the deployment's environment (Azure managed identity or an OAuth M2M service principal); PATs only for local development, never in code, YAML, or config. [DBSDK:authentication, U]
- `DatabricksClientResource` (`dagster-databricks`) takes exactly one of `token`, `oauth_credentials`, `azure_credentials`, `credentials_strategy`. [DG:integrations/libraries/databricks/dagster-databricks]

## Pipes and Databricks Connect (explicit request only)

- Pipes (`PipesDatabricksServerlessClient` with an existing Unity Catalog volume, `PipesDatabricksClient` with `jobs.SubmitTask`) submits one-time runs with Dagster-defined compute; the external code wraps work in `open_dagster_pipes(...)` and reports a materialization only after persisting its output. [DG:integrations/libraries/databricks/pipes/serverless-compute, DG:integrations/libraries/databricks/pipes/classic-clusters, DG:integrations/external-pipelines]
- Databricks Connect keeps Python in the Dagster process with remote Spark: never for long or large batch work. [DG:integrations/libraries/databricks/databricks-connect]
- Step launchers (`databricks_pyspark_step_launcher`) are superseded by Pipes. [DG:migration/upgrading, DG:integrations/libraries/databricks/dagster-databricks]

## Local platform (observed 2026-09-25; repo config wins)

- One Databricks workspace per environment (dev, tst, prd) on a shared Unity Catalog metastore; catalogs `dwh_<env>`, `sandbox_<env>`, `finance_analytics_<env>`. [U]
- Jobs and pipelines come from the `data_platform` bundle; the orchestration principal is `orchestration_mi`; CI/CD runs in Azure DevOps. [U]
