# Tasks, data, and concurrency
Tags → skill://airflow/sources.md.

## Task design
- A task is a transaction: a complete result or none; reruns give the same result (UPSERT/MERGE or partition overwrite, never a blind INSERT). [AF:best-practices, LEARN:dag-best-practices]
- Read and write the run's slice (`data_interval_start`/`data_interval_end` with data-interval timetables, else `logical_date`), never "latest" data or `now()`; cron schedules default to zero-width intervals (skill://airflow/authoring.md §Schedules). [AF:best-practices, AF:authoring-and-scheduling/timetable]
- Runs without a logical date (manual/API) take their slice from `params` or fail fast. [AF:templates-ref, AF:core-concepts/params]
- One logical step per task so a failure reruns only that step; incremental loads filter on a monotonic column (modified timestamp, sequence id) bounded by the slice. [LEARN:dag-best-practices]
- Self-check external writes (row count, partition present) in the task or a check task (`SQLColumnCheckOperator`, `SQLTableCheckOperator`, `SQLValueCheckOperator`, `SQLThresholdCheckOperator` from `airflow.providers.common.sql.operators.sql`). [AF:best-practices, PRV:common-sql/operators]
- Tasks share nothing on local disk: the next task may run on another worker; pass data through storage and hand over its URI. [AF:best-practices]

## Retries and timeouts
- `retries` defaults to 0 (`[core] default_task_retries`): set `retries` and `retry_delay` (default 300 s) in `default_args`; 3.2 accepts a numeric `retry_exponential_backoff` (`2.0` doubles each retry, capped by `[core] max_task_retry_delay`, 24 h). [AF:configurations-ref, AF:release_notes, LEARN:rerunning-dags]
- `execution_timeout` on every task that can hang (no default; for deferrable tasks it spans all deferrals); `dagrun_timeout` bounds a whole run. [AF:core-concepts/tasks, AF:configurations-ref, AF:administration-and-deployment/priority-weight]
- Sensors: `timeout` bounds the total wait and fails without retry (`soft_fail=True` → skipped); `poke_interval` default 60 s. [AF:core-concepts/tasks, LEARN:what-is-a-sensor]
- XComs of a failed try are cleared on retry: never use XCom as retry state. [AF:core-concepts/xcoms]
- Rerun by clearing through the UI, CLI, or API; never edit task state in the metadata DB. [LEARN:rerunning-dags]
- Not on 3.2.2: `ExceptionRetryPolicy` and provider `durable` flags (Airflow 3.3+). [LEARN:rerunning-dags, PRV:databricks/operators/run_now]

## XCom and data passing
- XCom carries small JSON-serializable metadata (ids, paths, counts, dataclasses); never DataFrames or file contents. [AF:core-concepts/xcoms, LEARN:dag-best-practices]
- Pydantic models are not native XCom types: validate input into models and return `model.model_dump(mode="json")` (skill://python/pydantic.md). [AF:authoring-and-scheduling/serializers, U]
- Pickled XCom is gone; custom types need `serialize()`/`deserialize()` or a registered serializer. [AF:release_notes, AF:authoring-and-scheduling/serializers]
- Storage I/O: `ObjectStoragePath("abfs://<conn_id>@<container>/<path>")` from `airflow.sdk` (Path API; schemes come from installed providers). [AF:core-concepts/objectstorage, LEARN:custom-xcom-backends-tutorial]
- Large XComs, when unavoidable: `AIRFLOW__CORE__XCOM_BACKEND=airflow.providers.common.io.xcom.backend.XComObjectStorageBackend`, `AIRFLOW__COMMON_IO__XCOM_OBJECTSTORAGE_PATH=abfs://<conn_id>@<container>/xcom`, `AIRFLOW__COMMON_IO__XCOM_OBJECTSTORAGE_THRESHOLD` in bytes (default `-1` = all in the DB; `0` = all remote), optional `AIRFLOW__COMMON_IO__XCOM_OBJECTSTORAGE_COMPRESSION` (e.g. `zip`); needs `apache-airflow-providers-microsoft-azure` for `abfs`. [LEARN:custom-xcom-backend-strategies, LEARN:custom-xcom-backends-tutorial]
- Set `multiple_outputs` explicitly on `@task` returning a dict to unpack. [RUFF:airflow-task-implicit-multiple-outputs]

## Dynamic task mapping
- Fan out over runtime lists with `.partial(<constants>).expand(<kwarg>=<list>)`; paired arguments via `.expand_kwargs(<list of dicts>)`; several `expand()` kwargs form a Cartesian product (use `.zip()` or `expand_kwargs` for pairs). [AF:authoring-and-scheduling/dynamic-task-mapping, LEARN:dynamic-tasks]
- Limits: `[core] max_map_length` 1024 (longer input fails the upstream task); cap concurrency with `max_active_tis_per_dag` / `max_active_tis_per_dagrun`; empty input skips the mapped task. [AF:configurations-ref, AF:authoring-and-scheduling/dynamic-task-mapping, LEARN:dynamic-tasks]
- `map_index_template` names mapped instances in the UI; per-element sequences map a `@task_group` (the `TaskGroup` class can't be mapped). [AF:authoring-and-scheduling/dynamic-task-mapping, LEARN:task-groups]

## Waiting: deferrable, reschedule, async
- Waits beyond a few minutes: deferrable operators (`deferrable=True` where the operator supports it) hand the wait to the triggerer and free the worker slot; else sensors with `mode="reschedule"`; `poke` holds a slot throughout. [AF:authoring-and-scheduling/deferring, LEARN:deferrable-operators]
- `AIRFLOW__OPERATORS__DEFAULT_DEFERRABLE=True` flips the default for supporting operators Deployment-wide. [LEARN:deferrable-operators]
- Triggerer: `[triggerer] capacity` 1000 triggers each; Astro includes one 0.5 vCPU / 1.875 GiB triggerer; scale with `ASTRO_TRIGGERER_REPLICAS` (max 8), `ASTRO_TRIGGERER_RESOURCES_CPU`, `ASTRO_TRIGGERER_RESOURCES_MEMORY`. [AF:configurations-ref, ASTRO:deployment-resources]
- TaskFlow/`PythonOperator` callables can't defer; for concurrent I/O inside one task, an `async def` `@task` (3.2+) runs on the worker and holds its slot. [AF:authoring-and-scheduling/deferring, LEARN:deferrable-operators]
- Custom triggers stay async and non-blocking; data between triggerer and worker is JSON-serializable. [AF:authoring-and-scheduling/deferring, LEARN:deferrable-operators]

## Concurrency
- Knobs: `[core] parallelism` 32 per scheduler; DAG `max_active_runs` and `max_active_tasks` (defaults 16 each); task `max_active_tis_per_dag`; pools for shared systems. [AF:configurations-ref]
- Pools cap concurrent use of a shared system (database, API): `pool="<name>"`, `pool_slots` weight; `default_pool` has 128 slots; a misspelled pool never schedules and shows no error; deferred tasks don't hold slots by default. [AF:administration-and-deployment/pools, LEARN:airflow-pools, AF:authoring-and-scheduling/deferring]
- DAG-run concurrency via `max_active_runs`, not pools. [LEARN:airflow-pools]
- `priority_weight` (default 1) with `weight_rule` (`downstream` default, `upstream`, `absolute`) orders queued tasks when slots are scarce. [AF:administration-and-deployment/priority-weight]

## Worker queues and isolation (Astro)
- Route with `queue="<queue-name>"` (lowercase letters and hyphens); unset → `default`. Separate queues for heavy vs light and short vs long tasks. [ASTRO:configure-worker-queues, ASTRO:best-practices/airflow-edge-cases]
- Worker types: `A5` 1 vCPU/2 GiB (concurrency 5 default, 15 max), `A10` 2/4 (10/30), `A20` 4/8 (20/60), `A40` 8/16 (40/120), `A60` 12/24 (60/180), `A120` 24/48 (120/360), `A160` 32/64 (160/480); 10 GiB ephemeral storage each. [ASTRO:configure-worker-queues, ASTRO:resource-reference-hosted]
- Workers per queue scale with (queued + running) / concurrency up to the max; scale-down waits 5 min after a worker's last task; deploys give running tasks up to 24 h, and long tasks can keep terminating workers (and cost) above the max. [ASTRO:astro-executor, ASTRO:deploy-project-image, ASTRO:best-practices/airflow-edge-cases]
- Conflicting Python deps: `@task.virtualenv`/`PythonVirtualenvOperator` (venv per run, install overhead), `@task.external_python`/`ExternalPythonOperator` (prebuilt env in the image), or `KubernetesPodOperator` (own image). [AF:best-practices]
- `KubernetesPodOperator` on Astro: `namespace=conf.get("kubernetes", "NAMESPACE")`, `image=os.getenv("ASTRONOMER_AIRFLOW_IMAGE")` for the Deployment image, `container_resources=k8s.V1ResourceRequirements(...)` (requests = limits, billed on limits); pods ≤ 43 vCPU/86 GiB by default; no ARM images or persistent volumes; needs `apache-airflow-providers-cncf-kubernetes`. [ASTRO:kubernetespodoperator, ASTRO:kpo-task-level-resources, ASTRO:kpo-run-current-image, PRV:cncf-kubernetes/operators]
- A worker OOM can lose task logs; the task then fails after about 5 min without a heartbeat. [ASTRO:best-practices/airflow-edge-cases]

## Metadata and secrets
- No metadata DB access from task or trigger code (no `airflow.settings.Session`, `create_session`, `@provide_session`, ORM models): use the task context, `airflow.sdk`, or the REST API (`/api/v2`). [AF:installation/upgrading_to_airflow3, AF:public-airflow-interface]
- Secrets never go in params, XCom, asset URIs or extras, or logs; masked field names include `password`, `secret`, `token`, `api_key`, `access_token` (`hide_sensitive_var_conn_fields` on). [AF:authoring-and-scheduling/assets, LEARN:airflow-params, LEARN:airflow-variables]
