# Testing and asset checks

Tags → skill://dagster/sources.md. General pytest conventions: skill://python/testing.md.

## Gates

- Before merge and deploy: `uv run dg check defs` (definitions load; exit 1 on errors), `uv run dg check yaml` and `uv run dg check toml` when components or config changed, then `uv run pytest`. [DG:api/clis/dg-cli/dg-cli-reference, SK:references/cli/check.md]
- One test calls `Definitions.validate_loadable()` on the project's definitions (key conflicts, unresolved jobs, missing resources, bad partition mappings). [DG:api/dagster/definitions]
- Unit tests never reach a Dagster deployment, Databricks, Azure, or SQL Server: resources are mocks or local fakes. [DG:guides/test/unit-testing-assets-and-ops, U]

## Unit tests

- Invoke assets directly with keyword arguments (upstream values, a `Config` instance, mock resources); `dg.build_asset_context(partition_key=...)` when the asset reads its context. [DG:guides/test/unit-testing-assets-and-ops]
- `dg.materialize([...], resources={...})` for wiring tests, upstream assets included; `dg.materialize_to_memory` installs an in-memory I/O manager, so pass none. [DG:api/dagster/execution]
- Test assets, not whole jobs; logic that runs in Databricks is tested in the bundle, the Dagster asset only for its trigger contract. [DG:guides/test/unit-testing-assets-and-ops, U]
- Schedules and sensors: call them directly with `dg.build_schedule_context(scheduled_execution_time=...)` or `dg.build_sensor_context(...)`; check each `RunRequest.run_config` with `dg.validate_run_config(job, run_config)`. [DG:guides/automate/schedules/testing-schedules, DG:guides/automate/sensors/testing-sensors]
- Automation conditions: `dg.evaluate_automation_conditions(defs=..., instance=dg.DagsterInstance.ephemeral(), evaluation_time=...)`, passing `cursor=result.cursor` between ticks; assert `total_requested` or `get_requested_partitions(key)`. [DG:api/dagster/assets, BLOG:orchestration-is-more-than-scheduling-declarative-automation-in-dagster]
- Resources: construct them directly; context-dependent methods get `dg.build_init_resource_context(...)`. [DG:guides/build/external-resources/testing-configurable-resources]
- Components: `dg.components.testing.create_defs_folder_sandbox()` for custom components; `ComponentTree.for_project(...)` to load and inspect instances. [DG:guides/build/components/creating-new-components/testing-your-component, DG:guides/build/components/building-pipelines-with-components/testing-component-definitions]
- Partitioned config: `get_partition_keys()`, `get_run_config_for_partition_key(key)`, `job.execute_in_process(partition_key=...)`. [DG:guides/test/testing-partitioned-config-and-jobs]
- A sensor test evaluation in the UI runs the sensor function for real, side effects included. [DG:guides/automate/sensors/testing-sensors]

## Asset checks

- One property per check (`@dg.asset_check(asset=...)` or `@dg.multi_asset_check`) returning `dg.AssetCheckResult(passed=..., metadata=...)`; `severity=dg.AssetCheckSeverity.ERROR` for hard failures (default `WARN`). [DG:guides/test/asset-checks]
- `blocking=True` stops downstream materialization when the check fails. [DG:guides/test/asset-checks]
- Partitioned checks share the asset's `partitions_def` (preview). [DG:guides/test/asset-checks]
- Data contracts: compare `dagster/column_schema` metadata against a versioned contract inside a check. [DG:guides/test/data-contracts]
- Checks cost no Dagster+ credits. [DG:guides/test/asset-checks]
- Freshness: `dg.FreshnessPolicy.time_window(fail_window=..., warn_window=...)` or `dg.FreshnessPolicy.cron(deadline_cron=..., lower_bound_delta=...)` (OSS needs `freshness.enabled: True`, preview); not `build_*_freshness_checks` (superseded 1.12) or `LegacyFreshnessPolicy`. [DG:guides/observe/asset-freshness-policies, DG:about/changelog]

## Logging and observability

- Log with `context.log` or `dg.get_dagster_logger()`; plain `logging` loggers reach the event log only when listed in `dagster.yaml` `python_logs.managed_python_loggers`. [DG:guides/log-debug/logging, DG:guides/log-debug/logging/python-logging]
- No PII or secrets in logs or metadata; where compute logs can carry PII, a custom compute log manager redacts on write (nothing reaches disk) or on read. [DG:examples/best-practices/pii-compute-logs, U]
- Windows or Azure hosts missing compute logs: set `PYTHONLEGACYWINDOWSSTDIO=1` and restart. [DG:guides/log-debug/logging]
- Dagster+ alerts need a notification service plus alert policies (asset, run, automation, code location); asset-health alerts fire on status transitions. [DG:guides/observe/alerts, DG:guides/observe/alerts/alert-policy-types]
