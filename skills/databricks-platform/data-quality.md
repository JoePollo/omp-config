# Data quality
Tags → skill://databricks-platform/sources.md.

## Pick the mechanism
| need | use |
|---|---|
| reject, drop, flag, or route bad rows inside a pipeline | expectations (+ quarantine routing) |
| reject bad writes to any Delta table | `NOT NULL` / `CHECK` constraints |
| declare keys and relationships (optimizer hints, not enforced) | `PRIMARY KEY` / `FOREIGN KEY` / `UNIQUE` |
| cross-table rules (counts, uniqueness, completeness) | validation materialized view + `expect_or_fail` |
| schema-wide freshness and completeness | anomaly detection (Preview) |
| distributions, drift, custom business metrics over time | data profiling |
| pass-rate trends and alerts for pipeline rules | event log expectation metrics |

[LDP:expectations, D:tables/constraints, LDP:expectation-patterns, DQ, DQ:data-profiling/, LDP:monitor-event-logs]

## House pattern (data_platform silver)
- Rules live in config: `quality.column_types` (generated `<column>_is_<type>` `TRY_CAST` checks) + named SQL booleans in `quality.expectations`; `@dp.expect_all` records metrics; rows route by `is_quarantined` / `_quarantine_reason` into `<name>` (valid), `<name>_quarantine`, `<name>_quarantine_history`. New silver rules follow this; details skill://databricks-platform/data-platform-bundle.md §Silver. [DP:src/data_platform/pipelines/silver/silver.py, DP:CONTRIBUTING.md]
- Monitor with `<catalog>.audit.quarantine_summary`, alert `silver_quarantine_summary`, dashboard `silver_quarantine_monitor`. [DP:src/data_platform/quarantine_monitor/view.py, DP:resources/quarantine_alerts.yml]

## Expectations
- Every dataset that can receive bad data: ≥ 1 expectation; per constraint choose `fail` (stop the world, e.g. a broken primary key), `drop` (discardable; quarantine what is dropped), or `warn` (only where someone watches the trend or rows are routed to quarantine). [LDP:best-practices/production-readiness]
- SQL `CONSTRAINT <name> EXPECT (<boolean>)`, optionally `ON VIOLATION DROP ROW` or `ON VIOLATION FAIL UPDATE`; Python `@dp.expect`, `@dp.expect_or_drop`, `@dp.expect_or_fail`, grouped `@dp.expect_all` / `@dp.expect_all_or_drop` / `@dp.expect_all_or_fail({name: expr})` (grouping is Python-only). [LDP:expectations]
- Names unique per dataset and say what is checked; constraints are row-level SQL booleans: no Python UDFs, external calls, or subqueries on other tables (cross-table → validation views). [LDP:expectations]
- `fail` rolls back atomically and names the offending record; triggered pipelines fail only that flow (siblings continue), continuous pipelines stop the flow and its dependents. [LDP:expectations]
- Metrics exist for `warn`/`drop` only: none for `fail`, sinks, unsupported operators, or flows without updates; views may report several sets or none; `AUTO CDC FROM SNAPSHOT` takes no expectations. [LDP:expectations]

## Business rules at scale
- Keep rules out of pipeline code: a Delta rules table (`name`, `constraint`, `tag`), a Python module, or config (house pattern), loaded into `@dp.expect_all*` (SQL can't load rules dynamically). [LDP:expectation-patterns]
- Cross-table checks as validation materialized views with `expect_or_fail`: row-count equality, missing records via left join, primary-key uniqueness (`GROUP BY pk` → `num_entries = 1`), values within 30-day ±3σ bounds. [LDP:expectation-patterns]
- A validation dataset never gates siblings in its pipeline: put validation in its own pipeline and make downstream pipeline tasks depend on it in a job. [LDP:expectation-patterns]
- Quarantine: one table flags `is_quarantined = NOT(all rules)` under `@dp.expect_all(rules)`, then valid and invalid views split it; bad rows stay inspectable and reprocessable. [LDP:expectation-patterns]
- Mixed schema versions: `unionByName(..., allowMissingColumns=True)` + rules like `CASE WHEN col IS NOT NULL THEN col > 0 ELSE TRUE END`. [LDP:expectation-patterns]

## Table constraints
- `NOT NULL` in the schema or `ALTER TABLE t ALTER COLUMN c SET NOT NULL`; `CHECK` via `ALTER TABLE t ADD CONSTRAINT name CHECK (...)`; existing rows are validated first; violations fail the transaction. [D:tables/constraints]
- `CHECK` expressions: deterministic built-in functions only (no UDFs, aggregates, window functions, or generators). [D:tables/constraints]
- Constraints raise the writer protocol (≥ 3): check outside Delta clients; `DROP FEATURE` removes `CHECK` support (DBR 15.4 LTS+). [D:tables/constraints]
- `PRIMARY KEY` / `FOREIGN KEY` (GA DBR 15.2+) and `UNIQUE` (Preview, DBR 18.2+) are informational: enforce uniqueness and integrity with validation checks; CTAS can't declare them. [D:tables/constraints]

## Anomaly detection (Preview)
- Schema-level freshness (from commit history) and completeness (rows committed in the last 24 h); percent-null (Beta); ≤ 3 slice columns per schema, sliced only when ≤ 50 distinct values (Beta). [DQ:anomaly-detection]
- Needs UC + serverless; `MANAGE` on the schema/catalog to enable, `SELECT`/`BROWSE` to view; results in `system.data_quality_monitoring.table_results`; exclude tables with `excluded_table_full_names`; ≤ 50 schemas per catalog-level enable; disabling deletes its job and tables irreversibly. [DQ:anomaly-detection]
- Alerts per catalog or schema, one email per unhealthy table (Beta; needs `MANAGE`). [DQ:anomaly-detection/alerts]

## Data profiling
- Profile types: `TimeSeries` (timestamp column + granularities; the first run covers the prior 30 days), `Snapshot` (full table each refresh, ≤ 4 TB), `InferenceLog`; one profile per table per metastore; profiles on materialized views don't refresh incrementally. [DQ:data-profiling/, DQ:data-profiling/create-monitor-api]
- Enable change data feed so `TimeSeries` refreshes read only new data; `schedule` for recurring refresh; `slicing_exprs` for segments; a baseline table for expected distributions; failure `notifications` (≤ 5 emails). [DQ:data-profiling/create-monitor-api, DQ:data-profiling/]
- Business metrics: custom metrics as Jinja SQL expressions (no joins or subqueries): aggregate (`:table` for multi-column), derived (from aggregates; cheaper), drift (`{{current_df}}` vs `{{base_df}}`). [DQ:data-profiling/custom-metrics]
- Output `<output_schema>.<table>_profile_metrics` and `_drift_metrics`; alerts = Databricks SQL query + alert on them (parameters use their defaults); drift signals `percent_null_delta`, `ks_test`, `chi_squared_test`, `population_stability_index` (< 0.1 none, < 0.2 moderate, ≥ 0.2 significant). [DQ:data-profiling/monitor-output, DQ:data-profiling/monitor-alerts]
- Requires `USE CATALOG`, `USE SCHEMA`, `SELECT`, and `MANAGE`; SDK `w.data_quality` (formerly `quality_monitors`; product formerly Lakehouse Monitoring); cost `billing_origin_product = 'DATA_QUALITY_MONITORING'`. [DQ:data-profiling/, DQ:data-profiling/create-monitor-api, DQ:data-profiling/expense]

## Pipeline quality metrics
- Event log `flow_progress` rows → `details:flow_progress.data_quality.expectations` (`name`, `dataset`, `passed_records`, `failed_records`) and `details:flow_progress.data_quality.dropped_records`; dashboards and alerts on regressions; event hooks for push alerts. [LDP:monitor-event-logs, LDP:best-practices]
- Know each pipeline's current pass rate before production. [LDP:best-practices/production-readiness]
