# Databricks pipelines
Tags → skill://databricks-platform/sources.md. Lakeflow Declarative Pipelines (LDP, formerly DLT) = Databricks' managed product; Apache Spark Declarative Pipelines (SDP) = open-source core (`pyspark.pipelines`, `spark-pipelines` CLI); check each platform's docs before relying on a feature. House framework: skill://databricks-platform/data-platform-bundle.md. [LDP:developer/python-ref, SDP]

## Dataset types
| use | type |
|---|---|
| ingestion (cloud files, message bus), CDC target, append-only or high volume | streaming table: each input row processed once |
| joins, aggregations, dashboard serving | materialized view: incrementally refreshed, not directly writable |
| intermediate logic with no outside readers | temporary view: no storage |

[LDP:best-practices]

- Medallion: bronze = streaming tables, minimal transformation, full history kept for recomputation; silver = streaming tables for row-level cleanup, materialized views for enrichment joins or aggregations; gold = materialized views. Separate ingestion (bronze) and transformation pipelines. [LDP:best-practices]

## Python
- `from pyspark import pipelines as dp`: `@dp.table` (streaming DataFrame → streaming table), `@dp.materialized_view` (batch DataFrame), `@dp.temporary_view`, `dp.create_streaming_table()` + `@dp.append_flow(target=...)`, `dp.create_auto_cdc_flow()`, `dp.create_auto_cdc_from_snapshot_flow()`, `dp.create_sink()`. [LDP:developer/python-ref]
- `@view` is the older `dlt` name for a temporary view; data_platform uses `@dp.view` and a batch `@dp.table` (`_snapshot_all`), so match existing files there and use `@dp.temporary_view` elsewhere. [LDP:developer/ldp-python-ref-view, DP:src/data_platform/pipelines/silver/silver.py]
- Read datasets with `spark.read.table()` / `spark.readStream.table()`; layout via `@dp.table(cluster_by_auto=True)` or `cluster_by=["col"]`; parameters via `spark.conf.get("<key>")`. [LDP:developer/definition-function, LDP:best-practices]
- Dataset functions only define: return a DataFrame; never write files or tables; never call DataFrame actions or writers (`collect()`, `count()`, `toPandas()`, `save()`, `saveAsTable()`, `start()`, `toTable()`) or `pivot()` in pipeline code, which is evaluated repeatedly (`groupBy(...).count()` aggregation is fine); loop-generated datasets only from an additive list. [SDP, LDP:developer/python-ref, LDP:best-practices]
- Let Spark errors surface inside dataset definitions: no broad `try`/`except` around transformations; never catch `AnalysisException` there. [LDP:best-practices/production-readiness]

| legacy `dlt` (still runs) | current |
|---|---|
| `import dlt` | `from pyspark import pipelines as dp` |
| `@dlt.table` streaming / batch | `@dp.table` / `@dp.materialized_view` |
| `@dlt.view` | `@dp.temporary_view` |
| `create_target_table()`, `create_streaming_live_table()` | `dp.create_streaming_table()` |
| `apply_changes()`, `apply_changes_from_snapshot()` | `dp.create_auto_cdc_flow()`, `dp.create_auto_cdc_from_snapshot_flow()` |
| `dlt.read()`, `dlt.read_stream()` | `spark.read.table()`, `spark.readStream.table()` |

[LDP:developer/python-ref, LDP:developer/definition-function]

## SQL
- `CREATE OR REFRESH STREAMING TABLE t AS SELECT ... FROM STREAM(src)`; `CREATE OR REFRESH MATERIALIZED VIEW mv AS SELECT ...` (no `STREAM`); several writers into one target: `CREATE FLOW f AS INSERT INTO t SELECT ... FROM STREAM(src)`. [LDP:developer/sql-dev, SDP]
- `CLUSTER BY AUTO` / `CLUSTER BY (cols)` in the create statement; parameters as `${key}` (e.g. `${source_catalog}.sales.transactions`). [LDP:best-practices]
- Legacy: `APPLY CHANGES INTO` → `AUTO CDC INTO`; `CREATE OR REFRESH LIVE TABLE` → `CREATE OR REFRESH MATERIALIZED VIEW`; drop the `LIVE.` qualifier (ignored in default publishing mode; names resolve in the pipeline's catalog/schema). [LDP:cdc, LDP:developer/sql-dev, LDP:live-schema]
- No `PIVOT` in pipeline SQL (SDP). [SDP]

## CDC
- `AUTO CDC ... INTO` / `dp.create_auto_cdc_flow()` for change feeds, `dp.create_auto_cdc_from_snapshot_flow()` for snapshots (Python only); never hand-written `MERGE` inside pipelines: ordering, dedup, out-of-order events, and schema evolution are handled. [LDP:best-practices, LDP:cdc]
- Target: a streaming table; change feeds require `KEYS` + `SEQUENCE BY`; ties: `SEQUENCE BY STRUCT(ts_col, id_col)` (left to right); snapshot sequencing never `NULL`. [LDP:cdc, LDP:developer/ldp-python-ref-apply-changes]
- `STORED AS SCD TYPE 1` overwrites; `STORED AS SCD TYPE 2` keeps history in `__START_AT`/`__END_AT`; `TRACK HISTORY ON * EXCEPT (cols)` / `track_history_except_column_list` stops versioning on noisy columns. [LDP:cdc]
- `APPLY AS DELETE WHEN` / `apply_as_deletes`; `APPLY AS TRUNCATE WHEN` / `apply_as_truncates`; drop operation and sequence columns with `COLUMNS * EXCEPT (op, seq)` / `except_column_list`. [LDP:cdc]
- Snapshots: version function (ascending) when order matters; ingestion-time mode only for regular, in-order snapshots. [LDP:cdc]
- Needs serverless or the `Pro`/`Advanced` edition; no expectations on `AUTO CDC FROM SNAPSHOT`. [LDP:cdc, LDP:expectations]

## Streaming state
- Watermark every stateful operation (windowed aggregations, dedup); stream-stream joins: watermarks on both sides plus a time-bounded join condition. [LDP:best-practices]
- At-least-once sources: dedupe on event-identity columns with `dropDuplicatesWithinWatermark`. [LDP:best-practices/processing-guarantees]
- Changing stateful logic (watermark, aggregation keys) requires a full refresh, which loses data the source no longer retains → bronze keeps full history. [LDP:best-practices]
- Stream-static joins read the static side's snapshot per micro-batch; late dimension rows never reach already-processed facts → materialized view when that matters. [LDP:best-practices]
- At-least-once edges (sinks, `foreach_batch_sink`, Kafka, custom sources without reliable offsets): receivers upsert idempotently; sinks are Python-only and append-only, and a full refresh doesn't clean their output. [LDP:best-practices/processing-guarantees, SDP]

## Materialized views
- Incremental refresh runs only on serverless (classic recomputes fully). [LDP:incremental-refresh]
- Sources: Delta, materialized views, streaming tables, UC managed Iceberg; enable deletion vectors, row tracking, and change data feed on them; sources whose history expires → streaming tables instead. [LDP:incremental-refresh]
- Stay incrementalizable: deterministic functions; no time-dependent business values (derive them from source events or parameters); `CAST` `FLOAT`/`DOUBLE` aggregation inputs to `DECIMAL`; `PARTITION BY` on window functions; recursive CTEs always recompute. [LDP:incremental-refresh, LDP:best-practices/processing-guarantees]
- Refresh policy `INCREMENTAL STRICT` when falling back to a full recompute must fail instead (default `AUTO` is cost-based). [LDP:incremental-refresh]
- Why no incremental refresh: event log `details:planning_information`. [LDP:monitor-event-logs]

## Pipeline design
- One pipeline per shared domain, dependency chain, freshness, and cadence; split at team, schedule, latency, or scale boundaries; ≤ 16 dataset updates run in parallel per update. [LDP:best-practices/organize-datasets]
- Triggered mode by default; continuous only for seconds-to-minutes latency; real-time mode for sub-second. [LDP:best-practices]
- Serverless for new pipelines; classic → enhanced autoscaling. [LDP:best-practices, LDP:best-practices/production-readiness]
- Small files: trigger interval matched to volume. Skew: liquid clustering at rest; salt hot keys and aggregate in two stages in flight. Small dimensions: `/*+ BROADCAST(d) */` or `broadcast(d)`. [LDP:best-practices]

## Deploy & run
- Source in Git, deployed with Declarative Automation Bundles: `databricks.yml` (more YAML via `include`), one target per environment, `databricks bundle validate` then `databricks bundle deploy --target <t>`; Python resources via the `python` section (Databricks CLI 0.275.0+). [LDP:best-practices, D:dev-tools/bundles/, D:dev-tools/bundles/python]
- Environment values (catalogs, schedules, paths) in bundle targets and pipeline configuration, never in source. [LDP:best-practices, LDP:best-practices/production-readiness]
- Schedule with Lakeflow Jobs or the external orchestrator; conditional execution and gates → several pipeline tasks in one job. [LDP:best-practices/production-readiness, LDP:expectation-patterns]
- Run as a service principal with only `USE CATALOG`, `USE SCHEMA`, `CREATE TABLE` / `CREATE MATERIALIZED VIEW` on targets and `SELECT` on sources; run-as defaults to the creator; changing it moves dataset ownership at the next refresh. [LDP:privileges, UC:manage-privileges/]
- Before production: failure notifications (email, webhook, event hook) and a known checkpoint-recovery procedure. [LDP:best-practices/production-readiness]

## Observe
- Event log: `event_log('<pipeline-id>')` (hidden `event_log_<id>` table in the pipeline's default schema); publish it to a named table and share it through a view; never delete it or its catalog/schema. [LDP:monitor-event-logs]
- Fleet: `system.lakeflow_pipeline_events_preview.pipeline_events` (Beta; all pipelines in the region), `system.lakeflow.pipelines`; cost via `system.billing.usage` `usage_metadata.dlt_pipeline_id`; track update-duration trends. [LDP:monitor-and-query-events, LDP:best-practices/production-readiness, LDP:monitor-event-logs]
