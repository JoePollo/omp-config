# Transformations and orchestration

Tags → skill://snowflake/sources.md. Airflow DAG design lives in skill://airflow.

## Choosing

| Need | Use |
|---|---|
| Declarative multi-step SQL (joins, aggregates, windows) | Dynamic table (DT) |
| Procedures, MERGE/upsert, SCD2, SEQ/UUID keys, external calls, CRON, DML on output | Stream + task |
| Single-table acceleration, zero lag, optimizer rewrite (Enterprise+) | Materialized view |

- DT limits: `TARGET_LAG` ≥ 60 s; read-only except frozen-region DML; no stream, external, directory-table, or MV sources; definition changes reinitialize. [UG:dynamic-tables/decision-guide, UG:dynamic-tables/frozen-regions, UG:views-materialized]

## Dynamic tables

- Duration `TARGET_LAG` on leaf DTs (staleness target, not a schedule); `TARGET_LAG = DOWNSTREAM` on intermediates; a DOWNSTREAM DT without consumers never refreshes and never warns. [UG:dynamic-tables/target-lag, UG:dynamic-tables/best-practices]
- Set `REFRESH_MODE` explicitly in prod: `ADAPTIVE` (GA 2026-07-30) when incrementalizable, else `INCREMENTAL` or `FULL`; default `AUTO` resolves once at create, never to ADAPTIVE, and later fails instead of falling back; check `refresh_mode_reason` in SHOW DYNAMIC TABLES. [UG:dynamic-tables/refresh-modes, REL:2026/other/2026-07-30-dynamic-tables-adaptive-refresh-mode-ga]
- Change refresh mode with CREATE OR ALTER DYNAMIC TABLE (ALTER can't); CREATE OR REPLACE reinitializes the DT and downstream incremental DTs: add `COPY GRANTS`, pick a window. [UG:dynamic-tables/refresh-modes, UG:dynamic-tables/best-practices]
- Incremental blockers: EXCEPT/INTERSECT/MINUS, LIMIT/TOP, subqueries outside FROM, non-equi outer joins, ROLLUP/CUBE/GROUPING SETS, WITH RECURSIVE, sequences, RANDOM/UUID_STRING, UDTFs, external functions, `CURRENT_TIMESTAMP` outside WHERE/HAVING/QUALIFY (use `METADATA$ROW_LAST_COMMIT_TIME`), base tables without change tracking. [UG:dynamic-tables/supported-queries]
- One GROUP BY/DISTINCT/window per incremental DT; chain DTs instead. Add `PRIMARY KEY ... RELY` to base tables reloaded by INSERT OVERWRITE or TRUNCATE+COPY. [UG:dynamic-tables/best-practices, UG:dynamic-tables/cost]
- `INITIALIZE = ON_CREATE` (default) blocks CREATE on the first refresh and needs OPERATE on upstream DTs; `ON_SCHEDULE` returns at once: confirm the first refresh before exposing it. [SQL:sql/create-dynamic-table, UG:dynamic-tables/privileges, UG:dynamic-tables/best-practices]
- Dedicated `WAREHOUSE` per pipeline; larger `INITIALIZATION_WAREHOUSE` for (re)initializations. [UG:dynamic-tables/best-practices, UG:dynamic-tables/refresh-modes]
- Stable history: `FROZEN WHERE (<DT-column predicate>)` (was IMMUTABLE WHERE) skips it on refresh; expanding keeps state, shrinking/removing reinitializes; seed with `BACKFILL FROM <table>` (CREATE only). [UG:dynamic-tables/frozen-regions]
- Cost = refresh warehouse + Cloud Services change checks every cycle, even NO_DATA (billed above 10% of daily warehouse credits) + storage; lengthen lag on mostly-NO_DATA DTs; `TRANSIENT` drops fail-safe. [UG:dynamic-tables/cost, SQL:sql/create-dynamic-table]
- Refreshes run as the owner role (keep USAGE/SELECT on inputs); grant OPERATE/MONITOR, not OWNERSHIP, to operators. [UG:dynamic-tables/privileges]
- Failures raise no alert: set `LOG_EVENT_LEVEL = WARN` and alert on the event table. [UG:dynamic-tables/best-practices, UG:dynamic-tables/monitoring]
- Externally orchestrated DT: `SCHEDULER = DISABLE` (no `TARGET_LAG`) plus `ALTER DYNAMIC TABLE <dt> REFRESH`. [SQL:sql/create-dynamic-table, UG:dynamic-tables/target-lag]

## Streams

- Standard = net delta incl. deletes; `APPEND_ONLY = TRUE` for insert-only ELT (cheaper); `INSERT_ONLY = TRUE` required on external/externally managed Iceberg tables; type fixed at create. `SHOW_INITIAL_ROWS = TRUE` returns existing rows on first consumption. [UG:streams-intro, SQL:sql/create-stream]
- Offset advances only when a committed DML reads the stream (incl. CTAS, COPY INTO location); SELECT never does. Multi-statement consumption in BEGIN…COMMIT (repeatable read). One stream per consumer. [UG:streams-intro, UG:streams-manage, SQL:sql/create-task]
- Consume before `stale_after` (SHOW STREAMS); stale means recreate. Unconsumed streams extend source retention up to `MAX_DATA_EXTENSION_TIME_IN_DAYS` (default 14) at storage cost; CREATE OR REPLACE of the source stales them. [UG:streams-intro, UG:streams-manage]

## Tasks

- Serverless (omit `WAREHOUSE`; EXECUTE MANAGED TASK; ≤ XXLARGE; cap `SERVERLESS_TASK_MAX_STATEMENT_SIZE`) for stable runs needing schedule adherence; user-managed warehouse for busy shared warehouses, > XXLARGE, or `EXECUTE DBT PROJECT`. [UG:tasks-intro, SQL:sql/create-task, UG:data-engineering/dbt-projects-on-snowflake-orchestration]
- `SCHEDULE = '<n> MINUTES'` or `'USING CRON <expr> <tz>'`; a run still going skips the next slot. Triggered: `WHEN SYSTEM$STREAM_HAS_DATA('<s>')`, no SCHEDULE; serverless triggered needs `TARGET_COMPLETION_INTERVAL`. [UG:tasks-intro, UG:tasks-triggered]
- Graphs: root + `AFTER`; ≤ 1000 tasks, ≤ 100 parents/children each; one owner and schema; `FINALIZE = <root>` task for cleanup/notify. Suspend root before edits; `SYSTEM$TASK_DEPENDENTS_ENABLE('<root>')` resumes all; `EXECUTE TASK <root> RETRY LAST`. [UG:tasks-graphs, SQL:sql/create-task]
- On the root: `SUSPEND_TASK_AFTER_NUM_FAILURES` (default 10), `TASK_AUTO_RETRY_ATTEMPTS` (default 0, root only), `USER_TASK_TIMEOUT_MS` (default 3600000, whole graph; lowest non-zero with `STATEMENT_TIMEOUT_IN_SECONDS` wins). [SQL:sql/create-task, UG:tasks-graphs]
- `OVERLAP_POLICY` (`NO_OVERLAP` default, `ALLOW_CHILD_OVERLAP`, `ALLOW_ALL_OVERLAP`) replaces deprecated `ALLOW_OVERLAPPING_EXECUTION`; overlap only idempotent graphs. [REL:2026/other/2026-03-13-tasks-overlap-policy, UG:tasks-graphs]
- `ERROR_INTEGRATION`/`SUCCESS_INTEGRATION` take queue integrations on the account's cloud; AWS-hosted accounts use SNS (at-least-once, no cross-cloud); for email/Teams use task events + an alert on new data. [UG:tasks-errors, UG:notifications/creating-notification-integration-amazon-sns, UG:tasks-events, U]
- Owner role needs EXECUTE TASK (+EXECUTE MANAGED TASK if serverless) and warehouse USAGE; runs as a system service with owner privileges; grant OPERATE to operators; `EXECUTE AS USER` only for a dedicated service user (IMPERSONATE). Keep `AUTOCOMMIT = TRUE`. [UG:tasks-intro, SQL:sql/create-task]
- Environment values via `CONFIG = $${...}$$` + `SYSTEM$GET_TASK_GRAPH_CONFIG`; `EXECUTE TASK ... USING CONFIG` overrides one run. Tasks start suspended: `EXECUTE TASK` to test, then `ALTER TASK ... RESUME`. [UG:data-engineering/dbt-projects-on-snowflake-orchestration, REL:2026/other/2026-01-26-dynamic-task-config, UG:tasks-intro, U]

## Procedures and Snowflake Scripting

- Default owner's rights: owner privileges, proc's database/schema, no caller session variables (pass args); `EXECUTE AS CALLER` only when caller privileges/session are required. [DEV:stored-procedure/stored-procedures-rights]
- Dynamic SQL: `EXECUTE IMMEDIATE :sql USING (a, b)` with `?` binds; never concatenate inputs. [SQL:sql/execute-immediate, DEV:stored-procedure/stored-procedures-usage]
- Procedures aren't atomic: pair `BEGIN TRANSACTION … COMMIT` inside one proc; DDL commits implicitly; a transaction open at proc end rolls back with an error. [DEV:stored-procedure/stored-procedures-usage, SQL:transactions]
- Handle `STATEMENT_ERROR`, `EXPRESSION_ERROR`, `OTHER`; log `SQLCODE`/`SQLERRM`/`SQLSTATE`, then bare `RAISE;` so the caller sees the failure. [DEV:snowflake-scripting/exceptions]

## Idempotent loads

- MERGE source must be ≤ 1 row per key: `QUALIFY ROW_NUMBER() OVER (PARTITION BY <k> ORDER BY <ts> DESC) = 1` or GROUP BY; multi-matches error (`ERROR_ON_NONDETERMINISTIC_MERGE` default TRUE), unmatched duplicates all insert. [SQL:sql/merge, SQL:constructs/qualify]
- Stream MERGE: DELETE when `METADATA$ACTION = 'DELETE' AND NOT METADATA$ISUPDATE`; upsert from INSERT rows. [UG:dynamic-tables/decision-guide, UG:streams-intro]

## Alerts

- `CREATE ALERT ... SCHEDULE = '<n> minute' IF (EXISTS (<query>)) THEN <action>`, then `ALTER ALERT ... RESUME`; needs EXECUTE ALERT (+EXECUTE MANAGED ALERT if serverless); set `SUSPEND_ALERT_AFTER_NUM_FAILURES`; window with `SNOWFLAKE.ALERT.LAST_SUCCESSFUL_SCHEDULED_TIME()`..`SCHEDULED_TIME()`. [UG:alerts]
- Alerts on new data (GA 2025-07-18; one change-tracked table/view, no joins/CTEs/DML) watch event-table failures; notify via `SYSTEM$SEND_SNOWFLAKE_NOTIFICATION` over email, webhook (Teams, Slack), or queue integrations. [UG:alerts, REL:2025/other/2025-07-18-alerts-on-new-data, UG:notifications/about-notifications]

## dbt Projects on Snowflake

- GA 2025-11-06. Deploy with `snow dbt deploy` from CI; no `--force` (CREATE OR REPLACE loses run history); SQL deploy from a Git stage skips review (dev only). [REL:2025/other/2025-11-06-dbt-projects-on-snowflake-ga, UG:data-engineering/dbt-projects-on-snowflake-deploy]
- `EXECUTE DBT PROJECT <db>.<schema>.<proj> ARGS='build --target <env>'`; concurrent runs `WRITEBACK = FALSE`; caller needs EXECUTE DBT PROJECT, profile role governs data; same warehouse in task/connection and profile. [UG:data-engineering/dbt-projects-on-snowflake-orchestration]

## Airflow orchestration

- Provider 6.x removed `SnowflakeOperator`: use `SQLExecuteQueryOperator(conn_id=...)`; long statements: `SnowflakeSqlApiOperator(snowflake_conn_id=..., statement_count=<n>, deferrable=True)`. [AFP:changelog, AFP:operators/snowflake]
- Connection per environment, service user: key pair via extra `private_key_content` (base64) or `private_key_file`, passphrase in Password; Entra via `azure_conn_id` or `authenticator = WORKLOAD_IDENTITY` + `workload_identity_provider = AZURE`. [AFP:connections/snowflake, UG:data-engineering/dbt-projects-on-snowflake-orchestration, U]
