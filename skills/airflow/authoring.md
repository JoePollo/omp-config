# DAG authoring (Airflow 3.2)
Tags → skill://airflow/sources.md.

## Imports
- DAG-authoring names come from `airflow.sdk`: `DAG`, `dag`, `task`, `task_group`, `TaskGroup`, `setup`, `teardown`, `Asset`, `AssetAlias`, `AssetAll`, `AssetAny`, `Param`, `Variable`, `Connection`, `BaseOperator`, `BaseSensorOperator`, `BaseHook`, `BaseNotifier`, `Label`, `ObjectStoragePath`, `chain`, `chain_linear`, `cross_downstream`, `get_current_context`, `get_parsing_context`. [AF:public-airflow-interface, AF:installation/upgrading_to_airflow3]
- Operators and sensors come from providers: `airflow.providers.standard.operators.{bash,python,empty,trigger_dagrun,latest_only,hitl}`, `airflow.providers.standard.sensors.{external_task,date_time,time_delta,filesystem}`; SQL runs through `airflow.providers.common.sql.operators.sql.SQLExecuteQueryOperator` (replaces `MsSqlOperator`, `PostgresOperator`, `MySqlOperator`). [PRV:standard/operators/index, PRV:microsoft-mssql/operators]
- Timetables: `airflow.timetables.trigger` (`CronTriggerTimetable`, `DeltaTriggerTimetable`, `MultipleCronTriggerTimetable`), `airflow.timetables.interval` (`CronDataIntervalTimetable`, `DeltaDataIntervalTimetable`), `airflow.timetables.events.EventsTimetable`, `airflow.timetables.assets.AssetOrTimeSchedule`. [AF:authoring-and-scheduling/timetable, AF:_api/airflow/timetables/interval/index]

## Airflow 2 → 3
| Airflow 2 | Airflow 3.2 |
|---|---|
| `from airflow import DAG`, `airflow.models.dag.DAG`, `airflow.decorators` | `from airflow.sdk import DAG, dag, task, task_group` |
| `airflow.models.baseoperator.BaseOperator`, `airflow.sensors.base.BaseSensorOperator`, `airflow.hooks.base.BaseHook`, `airflow.models.variable.Variable` | the same names from `airflow.sdk` |
| `airflow.operators.{bash,python,empty}`, `airflow.sensors.{external_task,filesystem}` | `airflow.providers.standard.…` |
| `airflow.datasets.Dataset`, `DatasetAlias`, `DatasetAll`, `DatasetAny` | `airflow.sdk.Asset`, `AssetAlias`, `AssetAll`, `AssetAny` |
| `schedule_interval=`, `timetable=` | `schedule=` |
| `fail_stop=` | `fail_fast=` |
| `days_ago(n)` | a fixed `pendulum.datetime(...)` |
| `SubDagOperator` | `@task_group` or asset-scheduled DAGs |
| `sla=`, `sla_miss_callback=` | Deadline Alerts, Astro alerts |
| `execution_date`, `next_ds`, `prev_ds`, `yesterday_ds`, `tomorrow_ds` (+ `_nodash`), `next_execution_date`, `prev_execution_date`, `prev_execution_date_success` | `logical_date`, `data_interval_start`, `data_interval_end`, `prev_data_interval_start_success`, `macros.ds_add(ds, n)` |
| ORM sessions, `@provide_session` in tasks | task context, `airflow.sdk`, REST API |
| REST `/api/v1` | `/api/v2` |
| pickled XCom | JSON-serializable values or a custom XCom backend |

[AF:installation/upgrading_to_airflow3, AF:release_notes, AF:templates-ref, RUFF:airflow3-removal, RUFF:airflow3-suggested-update, LEARN:airflow-upgrade-2-3]
- Migrate with `ruff check dags/ --select AIR301 --show-fixes`, then `--fix` (Ruff ≥ 0.13.1); `AIR302`, `AIR311`, `AIR312` cover provider moves and deprecated shims. [AF:installation/upgrading_to_airflow3, RUFF]

## DAG definition
- Every DAG sets: a stable, unique `dag_id`; `schedule` (default `None` = manual/API only); a fixed timezone-aware `start_date` (`pendulum.datetime(2026, 1, 1, tz="UTC")`); `catchup` (default `False`); `default_args` (`owner`, `retries`, `retry_delay`, `execution_timeout`); `tags`; `max_active_runs=1` when runs must not overlap. [AF:core-concepts/dags, AF:configurations-ref, AF:best-practices, RUFF:airflow-dag-no-schedule-argument]
- `@dag` functions must be called at module level (`orders_daily()`); `with DAG(...)` registers on entry; only module-level DAG objects are discovered. [AF:core-concepts/dags, AF:howto/dynamic-dag-generation]
- DAG docs: a module docstring plus `doc_md=__doc__` (Markdown; the only documentation attribute rendered). [AF:core-concepts/dags]
- TaskFlow `@task` for Python steps, provider operators for integrations; wire them by passing TaskFlow return values or an operator's `.output`, never Jinja `ti.xcom_pull(...)` strings. [AF:core-concepts/xcoms, RUFF:airflow-xcom-pull-in-template-string]
- Repeated settings (connection ids, paths) go in `default_args`, not on every task. [AF:best-practices]
- New DAGs start paused (`[core] dags_are_paused_at_creation` True); `max_consecutive_failed_dag_runs` auto-pauses after N failed runs (default 0 = off). [AF:configurations-ref]

## Schedules
- `schedule` takes a cron string or preset (`"@daily"`), a `timedelta`, a timetable instance, an asset expression, `None`, or `"@continuous"` (requires `max_active_runs=1`). [LEARN:scheduling-in-airflow, AF:authoring-and-scheduling/timetable]
- Cron strings default to `CronTriggerTimetable`: the run fires at the tick and `data_interval_start == data_interval_end`. For interval semantics pass `schedule=CronDataIntervalTimetable("<cron>", timezone="UTC")` (fires at interval end, covers the interval); `timedelta` likewise → `DeltaTriggerTimetable` vs `DeltaDataIntervalTimetable`. Prefer the explicit instance over flipping Deployment-wide `[scheduler] create_cron_data_intervals`. [AF:configurations-ref, AF:authoring-and-scheduling/timetable]
- Paused-then-resumed DAGs: trigger timetables skip missed ticks; data-interval timetables immediately run the latest missed interval. [AF:authoring-and-scheduling/timetable]
- Backfills are scheduler-managed in Airflow 3 (UI, API, CLI) and use the latest DAG version; `catchup=True` only when history must run automatically. [LEARN:rerunning-dags, AF:configurations-ref]
- Manual and API runs may have no `logical_date` (then no `ds`, `ts`, or interval); asset-triggered runs never have one. [AF:templates-ref]

## Params and templating
- Per-run input: `params={"<name>": Param(<default>, type="...", enum=[...])}` (JSON Schema validated; renders the trigger form); read `{{ params.<name> }}` or `get_current_context()["params"]`; precedence run conf > task `params` > DAG `params`; not encrypted → no secrets. [AF:core-concepts/params, LEARN:airflow-params]
- Template context (3.2): `data_interval_start`, `data_interval_end`, `logical_date`, `ds`/`ts` (only with a logical date), `run_id`, `dag_run`, `ti`, `task`, `params`, `var.value`/`var.json`, `conn`, `macros`, `triggering_asset_events`, `inlet_events`/`outlet_events`. [AF:templates-ref]
- Templated fields render at run time: use them instead of module-level lookups; `render_template_as_native_obj=True` keeps native types; long SQL or scripts live in files resolved via `template_searchpath`/`template_ext`; `literal(...)` suppresses rendering. [AF:core-concepts/operators, LEARN:airflow-sql]

## Dependencies and control flow
- Wire with `>>`/`<<`, `chain()` (adjacent lists of equal length), or `chain_linear()` (any lengths); list `>>` list is invalid. [LEARN:managing-dependencies]
- Default trigger rule `all_success`; joins after branches use `none_failed_min_one_success`; `fail_fast=True` stops the run at the first failure (then only `all_success`/`all_done_setup_success` are allowed). [AF:core-concepts/dags, LEARN:airflow-trigger-rules]
- Branching: `@task.branch` returns the task or group ids to run; `@task.short_circuit` for continue/skip. [LEARN:airflow-branch-operator, RUFF:airflow-task-branch-as-short-circuit]
- Resource lifecycles: setup/teardown (`create >> work >> delete.as_teardown(setups=create)`); teardown runs even after failures and fails the run only with `on_failure_fail_dagrun=True`. [AF:howto/setup-and-teardown]
- Watcher: a leaf task with `trigger_rule=TriggerRule.ONE_FAILED` and `retries=0`, downstream of every task, keeps the run failed when a teardown succeeds. [AF:best-practices]
- `@task_group` groups tasks and prefixes ids (`group.task`); reference full ids in XCom and branch returns. [LEARN:task-groups]

## Cross-DAG
- Data dependencies → assets: producer task `outlets=[Asset("<uri>")]`, consumer `schedule=[Asset("<uri>")]` (list = all updated; `a | b` any; `a & b` all; `AssetOrTimeSchedule` mixes in time). Events come only from Airflow tasks, the API, or the UI; paused consumers ignore events. [AF:authoring-and-scheduling/asset-scheduling, LEARN:airflow-datasets]
- Asset URIs and `extra` are stored in clear text: no secrets. [AF:authoring-and-scheduling/assets]
- Explicit trigger → `TriggerDagRunOperator(trigger_dag_id=..., conf=..., wait_for_completion=True, deferrable=True, skip_when_already_exists=True)`; the target DAG must be unpaused. [LEARN:cross-dag-dependencies]
- `ExternalTaskSensor` only to wait on a specific upstream task; it matches the same `logical_date` (else `execution_delta`/`execution_date_fn`); run it deferrable or with `mode="reschedule"`. [LEARN:cross-dag-dependencies]

## Notifications
- Callbacks: `on_failure_callback`, `on_success_callback` (DAG and task), `on_retry_callback`, `on_execute_callback`, `on_skipped_callback` (task); pass provider notifiers (`BaseNotifier` subclasses such as `SmtpNotifier`) before hand-written functions. [LEARN:error-notifications-in-airflow]
- Legacy SMTP config with `email_on_failure` is deprecated in Airflow 3; SMTP provider 3.x (Runtime 3.2-5+) validates STARTTLS certificates by default. [LEARN:error-notifications-in-airflow, RT:runtime-release-notes]
- SLAs are gone: Deadline Alerts (3.1+; 3.2 adds sync callbacks and several alerts per DAG) or Astro Timeliness/Duration alerts. [AF:core-concepts/tasks, AF:release_notes, ASTRO:best-practices/airflow-vs-astro-alerts]
- Human approval steps: `ApprovalOperator`, `HITLOperator`, `HITLBranchOperator`, `HITLEntryOperator` from `airflow.providers.standard.operators.hitl` (3.1+). [AF:tutorial/hitl, PRV:standard/operators/index]
