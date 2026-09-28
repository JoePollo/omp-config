# Query performance

Tags → skill://snowflake/sources.md. Warehouse size, QAS, queuing, auto-suspend → skill://snowflake/warehouses.md.

## Diagnose

- Triage in `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY` (≤45 min lag): rank by `total_elapsed_time`, group by `query_parameterized_hash`, compare `partitions_scanned` to `partitions_total`, check `bytes_spilled_to_local_storage`/`bytes_spilled_to_remote_storage`. [UG:performance-query-exploring, SQL:account-usage/query_history]
- Drill into one query with the Query Profile (kept 14 d) or `SELECT * FROM TABLE(GET_QUERY_OPERATOR_STATS('<query_id>'))` (needs OPERATE or MONITOR on the warehouse); start at the most expensive operator. [UG:ui-snowsight-activity, SQL:functions/get_query_operator_stats]
- `SNOWFLAKE.ACCOUNT_USAGE.QUERY_INSIGHTS WHERE is_opportunity` (≤90 min lag) names the condition and the fix; no insights for multi-step plans, secure objects, hybrid tables, or reused results. [UG:query-insights, SQL:account-usage/query_insights]
- `EXPLAIN USING TEXT <stmt>` compiles without a warehouse; `partitionsAssigned` vs `partitionsTotal` shows compile-time pruning. [SQL:sql/explain]

## Symptoms

| Profile signal (insight) | Fix |
|---|---|
| TableScan partitions scanned ≈ total; Filter above it drops rows (`QUERY_INSIGHT_UNSELECTIVE_FILTER`) | Prunable filter, clustering key, or search optimization |
| Join outputs far more rows than it reads (`QUERY_INSIGHT_EXPLODING_JOIN`) | Fix the join condition; filter inputs first |
| UnionAll with Aggregate on top (`QUERY_INSIGHT_UNNECESSARY_UNION_DISTINCT`) | `UNION ALL` |
| Bytes spilled, remote worst (`QUERY_INSIGHT_REMOTE_SPILLAGE`) | Smaller batches, else larger warehouse |

- Small nonzero `bytes_spilled_to_remote_storage` is normal when QAS is enabled on the warehouse. [UG:ui-snowsight-activity, UG:query-insights, UG:performance-query-warehouse-memory]

## Caches

- Result reuse needs identical text (case and aliases count), no `RANDOM`/`UUID_STRING`/external functions/hybrid tables, and unchanged data and micro-partitions (reclustering invalidates); lasts 24 h, each reuse extends it up to 31 d. [UG:querying-persisted-results]
- `USE_CACHED_RESULT` defaults TRUE; set FALSE via `ALTER SESSION` only to benchmark. Post-process with `RESULT_SCAN(LAST_QUERY_ID())` instead of rerunning. [SQL:parameters, UG:querying-persisted-results]
- The warehouse data cache drops on suspend; track `percentage_scanned_from_cache`. `SELECT COUNT(*) FROM t` is answered from metadata. [UG:performance-query-warehouse-cache, UG:ui-snowsight-activity]

## Pruning and SQL shape

- Micro-partitions (50–500 MB uncompressed) are columnar with per-column min/max: select only needed columns; filter on columns aligned with load order or the clustering key; predicates with a subquery never prune, even if constant. [UG:tables-clustering-micropartitions]
- Keep filter columns bare: `UPPER`/`LOWER` on a column prune poorly; casts on a column (except NUMBER→VARCHAR) disable search optimization; cast the constant instead. [UG:snowflake-optima, UG:search-optimization/queries-that-benefit]
- Top-K pruning needs `ORDER BY ... LIMIT` whose first key is an INTEGER/DATE/TIMESTAMP/string/binary column or a VARIANT field cast to its stored type (`v:i::NUMBER`); in joins it must come from the larger table; `DESC` on nullable needs `NULLS LAST`; with aggregates it must be a GROUP BY key. [UG:querying-top-k-pruning-optimization]
- VARIANT elements holding any JSON null or mixed types are not subcolumnarized (max 200 per partition) and force full-document scans: load with `STRIP_NULL_VALUES = TRUE` when null means missing; store dates, numbers-in-strings, and arrays as typed columns. [UG:semistructured-considerations]
- Snowflake Optima (all editions; Indexing/Metadata/Planning on Gen2 standard or Adaptive warehouses) adds hidden indexes at no cost, pruning metadata, and learned plans automatically; it complements these rules, not replaces them. [UG:snowflake-optima]

## Storage optimizations

| Workload | Use | Edition |
|---|---|---|
| Range/inequality filters, joins, sorts on the same few columns | Clustering key (one per table) | All |
| Selective lookups returning few rows; LIKE/RLIKE; VARIANT fields; GEOGRAPHY | Search optimization | Enterprise+ |
| Repeated aggregation or flattening of a subset of one table; external tables | Materialized view | Enterprise+ |

- Skip queries already ≤1 s; baseline query cost; start with 1–2 tables; the initial build can take about a week on very large tables. [UG:performance-query-storage, UG:performance-query-options]
- Search optimization or MVs on an auto-clustered table cost more because every recluster re-maintains them; batch DML and trim with infrequent DELETEs. [UG:performance-query-storage, UG:search-optimization/cost-estimation, UG:views-materialized]

## Clustering keys

- Cluster only multi-TB tables whose queries mostly filter or sort on the same columns and that are queried far more often than changed. [UG:tables-clustering-keys]
- Use ≤3–4 expressions: selective filters (dates) first, then join columns; order lowest→highest cardinality; reduce cardinality in an order-preserving way (`TO_DATE(ts)`, `TRUNC(n, -5)`); VARIANT only as `v:path::type`. [UG:tables-clustering-keys]
- Evaluate with `SYSTEM$CLUSTERING_INFORMATION('t', '(c1, c2)')` (high `average_depth` = poorly clustered; `version` OPTIMA/CLASSIC) and `SYSTEM$ESTIMATE_AUTOMATIC_CLUSTERING_COSTS('t', '(c1, c2)')` (±100%; average several runs). [SQL:functions/system_clustering_information, SQL:functions/system_estimate_automatic_clustering_costs]
- Since 2026-09-01 new clustering uses Optima Clustering: billed per uncompressed GB ingested × overlap factor (append-only by ingest date ≈ 0), key up to 1 KB vs Classic's first 5 bytes per column; existing tables stay on Classic. [UG:tables-auto-reclustering, UG:tables-clustering-keys]
- To stop Optima cost, `DROP CLUSTERING KEY` (resuming after `SUSPEND RECLUSTER` bills catch-up); any `CLUSTER BY` change reclusters; clones start suspended; CTAS doesn't carry the key. [UG:tables-auto-reclustering, UG:tables-clustering-keys]

## Search optimization (Enterprise+)

- Fits multi-second queries filtering a non-cluster-key column with ~100,000+ distinct values (`APPROX_COUNT_DISTINCT`); not FLOAT/GEOMETRY, external/hybrid/temporary tables, MVs, or Time Travel. [UG:search-optimization/queries-that-benefit]
- Scope columns: `ALTER TABLE t ADD SEARCH OPTIMIZATION ON EQUALITY(c1), SUBSTRING(c2), EQUALITY(v:user.uuid), GEO(g)`; bare `ADD SEARCH OPTIMIZATION` covers every eligible column, including future ones. [UG:search-optimization/enabling]
- Estimate first, especially SUBSTRING and VARIANT: `SYSTEM$ESTIMATE_SEARCH_OPTIMIZATION_COSTS('db.sch.t', 'SUBSTRING(c2)')` (±50%); index storage is typically ~1/4 of the table. [UG:search-optimization/cost-estimation, SQL:functions/system_estimate_search_optimization_costs]
- Measure only after `SHOW TABLES` shows `search_optimization_progress` at 100 and the profile shows "Search Optimization Access". [UG:search-optimization/enabling]

## Materialized views (Enterprise+)

- One table only; no joins, UDFs, window functions, HAVING, ORDER BY, or LIMIT; the optimizer rewrites base-table queries to use them; no maintenance-cost estimator; suspending only defers cost; avoid `SELECT *`. [UG:views-materialized]
