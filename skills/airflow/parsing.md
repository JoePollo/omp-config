# Parsing and the dag processor
Tags → skill://airflow/sources.md.

## Parse time vs run time
- The dag processor imports every DAG file at least every `min_file_process_interval` (30 s). Module code, imports, `with DAG(...)` blocks, `@dag` function bodies, operator arguments, and default-value expressions run on each parse; only task callables and operator `execute()` run at task time. [AF:best-practices, AF:administration-and-deployment/dagfile-processing, LEARN:dag-best-practices]
- Parse time builds DAG objects from static values only: no database queries, API or network calls, storage listings, heavy computation, or sleeps. [AF:best-practices, LEARN:dag-best-practices]
- Heavy libraries (documented: `pandas`, `torch`, `tensorflow`; likewise any slow or side-effecting import) are imported inside the task callable that uses them; cheap imports (stdlib, `pendulum`, `airflow.*`) stay at module top. In DAG files this overrides top-of-file import style. [AF:best-practices]
- Check: add a `print` and run `python dags/<file>.py` — whatever prints is parse-time code; `astro dev parse` runs the project's DAG integrity test; the Airflow UI shows parse duration (3.1+). [AF:best-practices, CLI:astro-dev-parse, AF:release_notes]
- Budgets: module import within `[core] dagbag_import_timeout` (30 s), the whole file within `[dag_processor] dag_file_processor_timeout` (50 s); overruns surface as import errors. [AF:configurations-ref, AF:administration-and-deployment/dagfile-processing]

## Variables, connections, config
- Never call `Variable.get()`, `Connection.get()`, `BaseHook.get_connection()`, or build hooks or clients at module level or in operator arguments: every parse makes a request. Use templated fields (`{{ var.value.<key> }}`, `{{ var.json.<key> }}`, `{{ conn.<conn_id>.host }}`) or read inside the task. [AF:best-practices, AF:templates-ref, LEARN:airflow-variables, RUFF:airflow-variable-get-outside-task]
- Parse-time inputs (DAG lists, schedules, generated tasks) come from environment variables or files shipped with the DAGs, never Airflow Variables. [AF:best-practices, AF:howto/dynamic-dag-generation]
- Last resort for an unavoidable parse-time Variable read: `[secrets] use_cache=True` (default `False`; `cache_ttl_seconds` 900), which caches Variables during parsing only. [AF:best-practices, AF:configurations-ref]
- Custom timetables: no Variable or Connection access in constructors or at module scope. [AF:best-practices]

## Dynamic DAGs
- Generate DAGs from environment variables, a YAML/JSON file beside the DAG (located via `__file__`), or pre-generated Python constants; keep the loop cheap and build the same tasks in the same order every parse (`sorted()`). [AF:howto/dynamic-dag-generation]
- Each generated DAG gets its own `dag_id` (`f"orders_{source}"`) and is registered by calling its `@dag` function or entering `with DAG(...)`. [AF:howto/dynamic-dag-generation]
- Skip building unrelated DAGs during task execution: `current = get_parsing_context().dag_id`; in the loop `if current is not None and current != dag_id: continue`. [AF:howto/dynamic-dag-generation]
- One file is parsed by one processor: split large generated sets across files to cut parse latency. [AF:best-practices]

## Layout and ignore
- `dags/` holds DAG files and DAG-coupled helpers, imported by bundle-qualified path (`import dags.common.naming`, never bare `import naming`); `include/` holds deployed non-DAG files (SQL, configs, data) and is not parsed. [CLI:develop-project]
- `include/` and `plugins/` ship only with image deploys; helpers that change together with DAGs live under `dags/` so DAG-only deploys carry them. [ASTRO:deploy-dags, CLI:develop-project]
- Helper packages under `dags/` need `__init__.py` and a `.airflowignore` entry (e.g. `common/`) so the processor doesn't parse them as DAG files. [AF:howto/dynamic-dag-generation, AF:core-concepts/dags]
- `.airflowignore` (`[core] dag_ignore_file_syntax` default `glob`): `*`/`?` stop at `/`, `**` spans directories, `!` re-includes (later lines win), a leading `/` anchors to the file's directory, `#` starts a comment; applies to its directory and below. [AF:core-concepts/dags]
- Safe mode (`[core] dag_discovery_safe_mode` default True) parses only `.py` files containing both `airflow` and `dag` (case-insensitive). [AF:core-concepts/dags]

## Processor tuning on Astro
- Defaults: `min_file_process_interval` 30 s, `refresh_interval` 300 s (new-file discovery), `parsing_processes` 2, `file_parsing_sort_mode` `modified_time`, `stale_dag_threshold` 50 s; override per Deployment with env vars `AIRFLOW__DAG_PROCESSOR__<KEY>`. [AF:configurations-ref, ASTRO:environment-variables]
- Fix DAG code before turning knobs; a longer `min_file_process_interval` saves CPU but delays pickup of changes. [AF:administration-and-deployment/dagfile-processing]
- Scheduler size sets processor capacity: Small ~50 DAGs (scheduler and processor share 1 vCPU/2 GiB), Medium ~250 (separate 1 vCPU/2 GiB processor), Large ~1,000 (3 vCPU/6 GiB processor), Extra Large ~2,000 (two processors); production Medium or larger. [ASTRO:deployment-resources]
- Processor CPU under 50% → raise `parsing_processes`; over 80% or beyond 12 processes → larger scheduler size. [ASTRO:best-practices/rightsize-airflow-on-astro]
- Slow parsing delays UI and scheduling updates and leaves tasks queued while workers parse. [ASTRO:best-practices/airflow-edge-cases]
- After a deploy, wait until the change is parsed and visible before triggering the DAG. [AF:best-practices]
