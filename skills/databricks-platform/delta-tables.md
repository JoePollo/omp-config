# Delta tables
Tags → skill://databricks-platform/sources.md.

## New tables
- Unity Catalog managed tables: auto compaction, optimized writes, metadata caching, file-size tuning, predictive optimization; new features land there first. [UC:best-practices, D:tables/managed]
- External tables only for: in-place Hive metastore upgrades, DR needs managed tables can't meet, outside readers/writers (reads only; writes through Databricks), non-Delta/Iceberg formats; one external location per schema. [UC:best-practices]
- Liquid clustering on every new table, streaming table, and materialized view: `CLUSTER BY AUTO` (UC managed + predictive optimization; DBR 15.4 LTS+) or `CLUSTER BY (k1, k2)`; never with `ZORDER`; `PARTITIONED BY` only for a quarantine routing table on `is_quarantined`. [D:tables/clustering, LDP:best-practices, DP:src/data_platform/pipelines/silver/silver.py]
- Replace in place with `CREATE OR REPLACE TABLE` (never drop + recreate at the same location); keep `CLUSTER BY AUTO` in the statement or automatic clustering and its keys are lost. [D:delta/best-practices, D:tables/clustering]
- Liquid clustering upgrades tables to writer v7 / reader v3 (no downgrade): confirm outside Delta clients first. [D:tables/clustering]

## Clustering keys
- Manual keys: most-filtered columns; ≤ 4 (fewer below 10 TB); drop one of two correlated columns; keys need statistics (first 32 columns by default). [D:tables/clustering]
- Change keys with `ALTER TABLE t CLUSTER BY (...)` or `ALTER TABLE t CLUSTER BY AUTO`; existing data reclusters only through `OPTIMIZE t FULL` (DBR 16.4+; run it after enabling or changing keys) or `OPTIMIZE t FULL WHERE <predicate>` (DBR 18.1+). [D:tables/clustering]
- Partitioned → clustered: `ALTER TABLE t REPLACE PARTITIONED BY WITH CLUSTER BY (cols)` (DBR 18.1+), keys close to the old partition columns (bare `WITH CLUSTER BY` keeps them); `... WITH CLUSTER BY AUTO` needs a UC managed table; pipeline streaming tables and materialized views change their definition to `CLUSTER BY` instead. [D:tables/clustering]

## Maintenance
- Predictive optimization runs `OPTIMIZE`, `VACUUM`, `ANALYZE` on UC managed tables (inherited account → catalog → schema → table); where it runs, schedule no `OPTIMIZE` jobs. [D:optimizations/predictive-optimization, D:tables/clustering]
- Without it: `OPTIMIZE` daily to start, clustered tables with frequent writes every 1–2 h, tables > 1 TB on a schedule; bin-packing `OPTIMIZE` is idempotent. [D:tables/operations/optimize, D:tables/clustering, D:tables/tune-file-size]
- `ZORDER BY` only on existing non-clustered tables; predictive optimization ignores Z-ordered files. [D:tables/operations/optimize, D:optimizations/predictive-optimization]
- `VACUUM` retention ≥ 7 days (the default): no `RETAIN 0 HOURS`, no disabling `spark.databricks.delta.retentionDurationCheck.enabled` unless no operation outlives the interval; longer time travel → set `delta.deletedFileRetentionDuration` before enabling predictive optimization. [D:tables/operations/vacuum, D:optimizations/predictive-optimization]
- `VACUUM` removes time travel beyond retention: never use time travel as history. [D:tables/operations/vacuum]
- `VACUUM t LITE` (Preview, DBR 16.4 LTS+) only after a successful full vacuum within log retention (30 days); `FULL` is the default. Physically purge soft deletes: `REORG TABLE t APPLY (PURGE)`, then `VACUUM`. [D:tables/operations/vacuum]
- Never put checkpoints or other files in a table directory unless the folder name starts with `_` or `.`. [D:tables/operations/vacuum]
- Why predictive optimization skipped a table: `DESCRIBE TABLE EXTENDED t AS JSON` → `predictive_optimization_evaluations` (DBR 18+); history in `system.storage.predictive_optimization_operations_history`. [D:optimizations/predictive-optimization]

## File size
- UC managed tables auto-tune file size by table size (256 MB below 2.56 TB up to 1 GB above 10 TB): set no `delta.targetFileSize` or `autoOptimize` properties (only `OPTIMIZE` honors `targetFileSize` there). [D:tables/tune-file-size]
- Upgrading workloads: remove `spark.databricks.delta.autoCompact.enabled` and `UNSET TBLPROPERTIES (delta.autoOptimize.autoCompact)` → background auto compaction. [D:tables/tune-file-size, D:delta/best-practices]
- External/legacy tables: auto compaction `auto`, optimized writes; `delta.targetFileSize` only for a measured need. [D:tables/tune-file-size]
- No `coalesce(n)`/`repartition(n)` right before writes; `maxRecordsPerFile` only for Parquet row-limit errors on very narrow tables. [D:tables/tune-file-size]
- Small files from frequent low-volume pipeline runs: lengthen the trigger interval. [LDP:best-practices]

## Reads & writes
- `MERGE`: add partition/clustering-key predicates to the match condition, compact small files; optimized writes are always on for `MERGE`; Low Shuffle Merge keeps layout on unmodified rows. [D:delta/best-practices, D:tables/tune-file-size]
- Never modify Delta data files directly; no `REFRESH TABLE`, `MSCK`, `ALTER TABLE ADD/DROP PARTITION`, or partition-path reads — filter with `WHERE`. [D:delta/best-practices]
- No Spark `cache()`/`persist()`/`CACHE TABLE` on Delta: loses data skipping, can serve stale data. [D:delta/best-practices]
- Downstream incremental consumers (egress, CDF readers): set `delta.enableChangeDataFeed = true` on the source table. [DP:src/data_platform/egress/run.py, LDP:incremental-refresh]

## Convert & recover
- External → managed: `ALTER TABLE t SET MANAGED` (DBR 17.3 LTS+ or serverless; keeps history and config; no `MOVE`/`COPY` for external tables); cancel `OPTIMIZE` jobs meanwhile; restart streams after; roll back with `UNSET MANAGED` within 14 days. [D:tables/convert-to-managed]
- Dropped managed table: `UNDROP TABLE` within the recovery period (default 7 days; configurable 0 h or 7–30 days, Preview). [D:tables/managed]
