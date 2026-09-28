# Snowpark and Python in Snowflake

Tags → skill://snowflake/sources.md. Python style → skill://python; ML compute and serving → skill://snowflake/ml-models.md.

## Sessions

- Local: `Session.builder.config("connection_name", name).create()` with `name` from config; never literal credentials or env names. [DEV:snowpark/python/creating-session, U]
- In Snowflake: procs receive `session` as first handler arg; notebooks call `get_active_session()` (`snowflake.snowpark.context`); `Session.builder.getOrCreate()` returns the last created session. [DEV:snowpark/python/creating-sprocs, UG:ui-snowsight/notebooks-sessions, DEV:snowpark/reference/python/latest/snowpark/api/snowflake.snowpark.Session.SessionBuilder.getOrCreate]

## DataFrames

- Lazy: transforms only build SQL; actions (`collect`, `count`, `show`, `to_pandas`, `save_as_table`) run it in Snowflake, UDFs included. [DEV:snowpark/python/working-with-dataframes]
- No client-side row loops or per-row `session.sql`; use set-based DataFrame ops or a UDF/UDTF so Snowflake parallelizes. [DEV:snowpark/index]
- `session.sql(q, params=[...])` binds qmark `?` only; never format values into SQL. [DEV:snowpark/reference/python/latest/snowpark/api/snowflake.snowpark.Session.sql]
- `to_pandas()` loads every row into client memory; reduce first or iterate `to_pandas_batches()`. [DEV:snowpark/reference/python/latest/snowpark/api/snowflake.snowpark.DataFrame.to_pandas_batches]
- Reused expensive intermediate: `cache_result()` (temp table, dropped at session close). [DEV:snowpark/reference/python/latest/snowpark/api/snowflake.snowpark.DataFrame.cache_result]
- `save_as_table(name, mode=)`: `append` (creates if missing), `overwrite` (drop+recreate; `overwrite_condition` = atomic delete-insert), `truncate`, `errorifexists`, `ignore`; `table_type="transient"`. [DEV:snowpark/reference/python/latest/snowpark/api/snowflake.snowpark.DataFrameWriter.save_as_table]
- pandas on Snowflake: `import modin.pandas as pd` + `import snowflake.snowpark.modin.plugin` (extra `snowflake-snowpark-python[modin]`); `pd.read_snowflake(...)`, `df.to_snowflake(name, if_exists=..., index=False)`. [DEV:snowpark/python/pandas-on-snowflake]
- Its hybrid execution (default since 1.40.0) runs small frames in local pandas (`df.get_backend()`); `apply`, `iterrows`, `plot` pull data local. [DEV:snowpark/python/pandas-on-snowflake]

## UDFs, UDTFs, UDAFs

- UDTF: `process` yields tuples; `__init__`/`end_partition` hold partition state; call `TABLE(f(...) OVER (PARTITION BY k))`. UDAF: `aggregate_state` (max 64 MB serialized), `accumulate`, `merge`, `finish`; no OVER. [DEV:udf/python/udf-python-tabular-functions, DEV:udf/python/udf-python-aggregate-functions]
- Inference or pandas libraries: vectorized UDF (pandas batch in, same-length Series out) via Snowpark `PandasDataFrame`/`PandasSeries` hints or SQL `@vectorized(input=pandas.DataFrame)`; 180 s per batch; `max_batch_size` only caps. [DEV:udf/python/udf-python-batch, DEV:snowpark/python/creating-udfs]
- Whole partition as one DataFrame: UDTF with vectorized `end_partition` (exclusive with vectorized `process`). [DEV:udf/python/udf-python-tabular-vectorized]
- No network in handlers: stage models/data, load once at module scope or `@cachetools.cached`; handlers thread-safe, single-threaded, stateless across rows. [DEV:udf/python/udf-python-designing, DEV:udf/python/udf-python-packages, DEV:snowpark/python/creating-udfs]
- Imported files: `sys._xoptions["snowflake_import_directory"]`; per-call stage files: `SnowflakeFile.open` on a `BUILD_SCOPED_FILE_URL`. [DEV:snowpark/python/creating-udfs]
- CPU parallelism: `joblib.Parallel`, never `multiprocessing`. [DEV:udf/python/udf-python-tabular-functions, DEV:stored-procedure/python/procedure-python-limitations]
- Snowpark `udf`/`udtf`/`sproc` default temporary; deploy with `is_permanent=True, stage_location="@...", replace=True`; use `session.udf.register` in multi-session code. [DEV:snowpark/python/creating-udfs]
- `RUNTIME_VERSION` GA 3.10-3.14; 3.9 decommissioned 30 Apr 2026, 3.10 deprecated 04 Oct 2026. [DEV:udf/python/udf-python-creating, DEV:python-runtime-support-policy]
- `SECURE` only to hide data or logic; it disables optimizations. [DEV:secure-udf-procedure]

## Stored procedures

- Proc for DDL/DML, orchestration, admin, training; UDF for per-row values in SQL. [DEV:stored-procedures-vs-udfs]
- Default `EXECUTE AS OWNER` (proc's schema, no caller session state, no named temp objects); `EXECUTE AS CALLER` for caller privileges and context; `RESTRICTED CALLER` is Preview. [DEV:stored-procedure/stored-procedures-rights, SQL:sql/create-procedure, DEV:stored-procedure/python/procedure-python-limitations]
- Add `snowflake-snowpark-python` to `packages` (server copy usually one version behind); no PUT/GET via `session.sql`; one-off `CALL ... WITH` needs no CREATE PROCEDURE. [DEV:stored-procedure/python/procedure-python-writing, DEV:stored-procedure/python/procedure-python-limitations, DEV:stored-procedure/python/procedure-python-overview]

## Packages

- Source: `ARTIFACT_REPOSITORY` > `DEFAULT_PYTHON_ARTIFACT_REPOSITORY` (schema > database > account) > implicit (Anaconda for 3.13 and lower in existing accounts; PyPI for 3.14+ and new accounts since 26 Jun 2026); set it explicitly per environment. [DEV:udf/python/udf-python-packages, REL:bcr-bundles/un-bundled/bcr-2325]
- PyPI: `ARTIFACT_REPOSITORY = snowflake.snowpark.pypi_shared_repository` (role `SNOWFLAKE.PYPI_REPOSITORY_USER`; not in anonymous procs); pin or bound versions; x86-only wheels need `RESOURCE_CONSTRAINT=(architecture='x86')`. [DEV:udf/python/udf-python-packages]
- Anaconda: check `INFORMATION_SCHEMA.PACKAGES` (`LANGUAGE = 'python'`); list top-level packages only; 2026_06 bundle requires `SNOWFLAKE.ANACONDA_REPOSITORY_USER`. [DEV:udf/python/udf-python-packages, REL:bcr-bundles/2026_06/bcr-2379]
- Versions freeze at CREATE; pin in temp UDFs; `DESCRIBE FUNCTION` lists them; cold warehouses install on first call (~30 s). [DEV:udf/python/udf-python-packages, DEV:snowpark/python/creating-udfs]
- Private code: stage zips in `IMPORTS` (unique file names); build with `snow snowpark package create`/`upload`. [DEV:udf/python/udf-python-creating, CLI:snowpark/upload]
- Any new package or repository needs explicit user approval; locally `uv add`. [U]
- UDF memory errors or single-node training: Snowpark-optimized warehouse (skill://snowflake/warehouses.md). [DEV:udf/python/udf-python-designing, UG:warehouses-snowpark-optimized]

## Telemetry

- stdlib `logging.getLogger(name)` (`extra=` lands in RECORD_ATTRIBUTES); traces via `from snowflake import telemetry` (`add_event`, `set_span_attribute`). [DEV:logging-tracing/logging-python, DEV:logging-tracing/tracing-python]
- Default event table `SNOWFLAKE.TELEMETRY.EVENTS` (read `EVENTS_VIEW`); per-database `EVENT_TABLE` is Enterprise+. [DEV:logging-tracing/event-table-setting-up]
- Defaults `LOG_LEVEL=OFF`, `TRACE_LEVEL=OFF`, `METRIC_LEVEL=NONE`; set on function/proc/schema/database; session vs object: most verbose wins. [SQL:parameters, DEV:logging-tracing/telemetry-levels]

## Notebooks and Streamlit

- Notebooks in Workspaces (GA 05 Feb 2026): Container Runtime on a compute pool, Python 3.10-3.12, SQL/Snowpark still on a warehouse; `!pip install` (PyPI repo, staged `.whl`, EAI), no Anaconda; fully qualify names. [REL:2026/other/2026-02-05-notebooks-in-workspaces, UG:ui-snowsight/notebooks-in-workspaces/notebooks-in-workspaces-migrate, UG:ui-snowsight/notebooks-in-workspaces/notebooks-in-workspaces-packages-runtime]
- Legacy Notebooks: no creation since 01 Sep 2026 (`CREATE NOTEBOOK PROJECT` instead); run, edit and `EXECUTE NOTEBOOK` stop Nov 2026. [REL:bcr-bundles/un-bundled/bcr-disable-legacy-notebooks]
- Streamlit warehouse runtime: per-viewer, Conda `environment.yml`, up to Python 3.11. Container runtime: shared, PyPI `requirements.txt`/`pyproject.toml`, Python 3.11, cross-session caching, cheaper for busy apps. Session: `st.connection("snowflake").session()`. [DEV:streamlit/app-development/runtime-environments]
