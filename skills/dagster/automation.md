# Automation, partitions, and concurrency

Tags → skill://dagster/sources.md.

## Choosing

- Declarative automation (`automation_condition=` on assets and checks) for dependency-aware refresh; schedules for fixed-time jobs; sensors for external polling, side effects, or per-event `run_config`; run-status sensors to react to run outcomes. [DG:guides/automate, DG:guides/automate/declarative-automation/migrating-from-sensors, SK:references/automation/choosing-automation.md]
- Conditions are side-effect free; notifications belong in run-status sensors or alert policies. [DG:guides/automate/declarative-automation/migrating-from-sensors]
- Declarative automation runs only while `default_automation_condition_sensor` is on (Automation tab; stopped by default; evaluates every 30 s). [DG:guides/automate/declarative-automation/automation-condition-sensors, SK:references/automation/declarative-automation/INDEX.md]
- New code uses `AutomationCondition`, never `AutoMaterializePolicy`/`AutoMaterializeRule`; `@multi_asset_sensor` only for side effects (superseded, removal planned for 2.0). [GH:MIGRATION.md, DG:migration/upgrading, DG:api/dagster/schedules-sensors]

## Declarative automation

- `AutomationCondition.eager()`: any upstream update requests the asset; waits while deps are missing or in progress; latest time partition only. [DG:guides/automate/declarative-automation/customizing-automation-conditions/customizing-eager-condition]
- `AutomationCondition.on_cron("<cron>")`: after each tick, requests once every dep has updated since that tick — a synchronization window, not a fixed-time launch; widen the cron if deps can't all finish inside it; latest time partition only. [DG:guides/automate/declarative-automation, DG:guides/automate/declarative-automation/migrating-from-sensors]
- `AutomationCondition.on_missing()`: fills missing partitions once deps exist; skips partitions already present when it was enabled. [DG:guides/automate/declarative-automation/customizing-automation-conditions/customizing-on-missing-condition]
- Customize with `.without(...)`, `.replace(...)`, `&`, `|`, `~` (e.g. drop `in_latest_time_window()` for history); assets that must run together belong in one asset job (job-level conditions are preview). [SK:references/automation/declarative-automation/INDEX.md, DG:guides/automate/declarative-automation/customizing-automation-conditions/customizing-on-cron-condition, BLOG:orchestration-is-more-than-scheduling-declarative-automation-in-dagster]
- Before turning a stopped automation sensor back on, preview its targets: eager may request every partition that became eligible meanwhile. [DG:guides/automate/declarative-automation/customizing-automation-conditions/preventing-runs-on-reactivation]

## Schedules and sensors

- Schedules: `dg.ScheduleDefinition` or `@dg.schedule` with a cron and `execution_timezone` (IANA; UTC by default); partitioned jobs use `build_schedule_from_partitioned_job` and the partition timezone; DST skips or repeats local times. [DG:guides/automate/schedules/defining-schedules, DG:guides/automate/schedules/customizing-execution-timezone]
- Sensors: `minimum_interval_seconds` is a floor; stable `RunRequest.run_key`s deduplicate; progress lives in `context.cursor`/`context.update_cursor(...)`; evaluations time out at 60 s, and work over ~3 min belongs in a job. [DG:guides/automate/sensors, DG:deployment/troubleshooting/sensor-timeouts]
- Sensors start stopped unless `default_status=dg.DefaultSensorStatus.RUNNING`; starting or stopping automation in a deployment is a deployment change. [DG:guides/automate/sensors, U]

## Partitions and backfills

- Time partitions for time windows, static for fixed categories, dynamic for runtime-discovered keys, `dg.MultiPartitionsDefinition` for two axes; at most 100,000 partitions per asset and 25,000 dynamic partition requests per sensor evaluation. [DG:guides/build/partitions-and-backfills/partitioning-assets, DG:api/dagster/schedules-sensors]
- Partitioned assets read and write only their slice (`context.partition_key`, `context.partition_time_window`, or `context.partition_key_range` in single-run backfills) and overwrite it idempotently. [DG:guides/build/partitions-and-backfills/backfilling-data, DG:examples/best-practices/partition-backfill-strategies]
- Explicit mappings through `dg.AssetDep(..., partition_mapping=...)` (`TimeWindowPartitionMapping`, `AllPartitionMapping`, `LastPartitionMapping`, `StaticPartitionMapping`); the default maps equal keys or overlapping windows. [DG:guides/build/partitions-and-backfills/defining-dependencies-between-partitioned-assets, DG:api/dagster/partitions]
- Backfills launch one run per partition by default; `dg.BackfillPolicy.multi_run(max_partitions_per_run=N)` batches; `dg.BackfillPolicy.single_run()` suits range-native compute (fewer Dagster+ credits, whole-range retries). [DG:guides/build/partitions-and-backfills/backfilling-data, DG:examples/best-practices/partition-backfill-strategies, DG:deployment/dagster-plus/management/credit-usage]
- Dagster doesn't delete data for expired partitions: a retention sensor deletes the data and removes the dynamic keys together. [DG:guides/build/partitions-and-backfills/data-retention]

## Concurrency, retries, timeouts

- Shared systems (a SQL Server, a warehouse) get a pool: `@dg.asset(pool="<name>")` plus a limit for it in deployment settings (`concurrency.pools.default_limit` as the fallback); deployment-wide caps via `concurrency.runs.max_concurrent_runs` and `concurrency.runs.tag_concurrency_limits`. [DG:guides/operate/managing-concurrency/concurrency-pools, DG:guides/operate/managing-concurrency/run-queue-limits, DG:guides/operate/managing-concurrency/run-tag-limits]
- With pools, set `run_monitoring.free_slots_after_run_end_seconds` so failed runs release slots. [DG:guides/operate/managing-concurrency/concurrency-pools, DG:deployment/execution/run-monitoring]
- Step retries: `dg.RetryPolicy(max_retries=..., delay=..., backoff=dg.Backoff.EXPONENTIAL)`; non-retryable errors raise `dg.Failure(..., allow_retries=False)`; run retries via the `dagster/max_retries` tag (on by default in Dagster+, `run_retries.enabled: true` in OSS). [DG:guides/build/ops/op-retries, DG:deployment/execution/run-retries]
- Using both: `run_retries.retry_on_asset_or_op_failure: false` limits run retries to crashes; the default `FROM_FAILURE` strategy needs storage readable across runs. [DG:deployment/execution/run-retries]
- Jobs have no default timeout: set the `dagster/max_runtime` tag (seconds) on jobs that can hang. [DG:deployment/execution/job-timeouts, DG:deployment/execution/run-monitoring]
