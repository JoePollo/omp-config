# Compute and cost

Tags → skill://snowflake/sources.md. Warehouse grant design → skill://snowflake/access.md.

## Warehouse types

| Type | Use for | Gate |
|---|---|---|
| Standard `GENERATION = '2'` | Default for SQL, ETL, BI; `'1'` only for X5LARGE/X6LARGE or regions/failover targets without Gen2 | GA [UG:warehouses-gen2] |
| `'SNOWPARK-OPTIMIZED'` | Memory- or CPU-arch-bound Snowpark, single-node ML training | 1 TB Preview, AWS only [UG:warehouses-snowpark-optimized] |
| `ADAPTIVE` | Bursty mixed BI/ETL without size, cluster, QAS, suspend tuning | Enterprise+, select regions [UG:warehouses-adaptive] |
| `CREATE INTERACTIVE WAREHOUSE` | Low-latency dashboards/APIs on interactive tables | 5 s statement cap, 1 h minimum billing [UG:interactive] |

- Always set `GENERATION = '2'` (quoted) unless a Gen1 case applies; omitted means `'2'` where available, existing Gen1 stays Gen1. [UG:warehouses-gen2, REL:bcr-bundles/2026_03/bcr-2250]
- Changing `GENERATION`, `RESOURCE_CONSTRAINT`, or `WAREHOUSE_TYPE` on a running warehouse bills old and new compute until in-flight queries end; suspend first. [UG:warehouses-gen2]
- Snowpark-optimized `RESOURCE_CONSTRAINT`: `MEMORY_1X` 16 GB (XSMALL+), `MEMORY_16X` 256 GB (MEDIUM+, default), `MEMORY_64X` 1 TB (LARGE+); `_x86` variants pin CPU. [UG:warehouses-snowpark-optimized]
- Adaptive: tune `MAX_QUERY_PERFORMANCE_LEVEL` (default `XLARGE`) and `QUERY_THROUGHPUT_MULTIPLIER` (default `2`, `0` = unlimited); billed per query; convert online; keep HTAP-heavy on Gen2. [UG:warehouses-adaptive]

## Sizing and isolation

- One warehouse per workload class (load, transform, BI, ad hoc, app, Snowpark), each running homogeneous queries. [UG:warehouses-considerations, BLOG:managing-snowflakes-compute-resources]
- Size by experiment: run the same representative 5-10 min queries on several sizes; each size step doubles credits/hour. [UG:warehouses-considerations, UG:warehouses-overview]
- Scale up (resize) for slow complex queries, out (multi-cluster) for concurrency; resizing skips running queries; downsizing drops cache. [UG:warehouses-considerations]
- Name by workload (`transform_wh`, `loader_wh`), never by size; per-env names and sizes come from config, never literals. [BLOG:managing-snowflakes-compute-resources, U]
- Set `DEFAULT_WAREHOUSE` on every user, service users included; client config overrides it, connection parameters override both. [UG:warehouses-overview]

## Suspend, resume, billing

- Per-second billing with a 60 s minimum per start or resume; resizing up bills 60 s of the added compute. [UG:cost-understanding-compute]
- `AUTO_SUSPEND` (seconds, default `600`, checked ~30 s): tasks `60`, ad hoc/data science ~`300`, BI >= `600` (cache); below regular query gaps it re-bills the minimum each resume; `0`/`NULL` never suspends; keep `AUTO_RESUME = TRUE`. [SQL:sql/create-warehouse, UG:performance-query-warehouse-cache, UG:warehouses-considerations]
- Create with `INITIALLY_SUSPENDED = TRUE` (default `FALSE` starts it running); `OR REPLACE` aborts running queries. [SQL:sql/create-warehouse]

## Multi-cluster (Enterprise+)

- Auto-scale every warehouse: `MIN_CLUSTER_COUNT = 1`, `MAX_CLUSTER_COUNT` 2-3, then raise from observed load; `MIN` > 1 only for HA; Maximized (`MIN = MAX`) only for flat high concurrency. [UG:warehouses-considerations, UG:warehouses-multicluster]
- `SCALING_POLICY = STANDARD` (default) adds clusters when queries queue; `ECONOMY` adds only when >= 6 min of load is estimated; use it where queuing is acceptable. [UG:warehouses-multicluster]

## QAS, concurrency, timeouts

- QAS (Enterprise+) offloads big selective scans and bulk DML/COPY to separately billed serverless compute; cap via `QUERY_ACCELERATION_MAX_SCALE_FACTOR` (`0` = none); test with `SYSTEM$ESTIMATE_QUERY_ACCELERATION('<query_id>')`. [UG:query-acceleration-service]
- Set `ENABLE_QUERY_ACCELERATION` explicitly: new Gen2/multi-cluster auto-enable at factor `2`, bundle 2026_06 at `8` for all new standard; ALTER never toggles it. [REL:bcr-bundles/un-bundled/bcr-2113, REL:bcr-bundles/2026_06/bcr-2373]
- `MAX_CONCURRENCY_LEVEL` (default `8`): lower it for heavy multi-statement jobs; in Auto-scale, reaching it starts clusters. [SQL:parameters]
- `STATEMENT_TIMEOUT_IN_SECONDS` (default `172800`; `0` means the `604800` max) spans queue, compile, and run; set it per warehouse to the workload SLA; lowest non-zero of warehouse and session wins. [SQL:parameters, UG:cost-controlling-controls]
- `STATEMENT_QUEUED_TIMEOUT_IN_SECONDS` (default `0`, never): set it on ad hoc and BI warehouses. [SQL:parameters, BLOG:managing-snowflakes-compute-resources]

## Spend controls

- Resource monitors cover warehouses only (plus their cloud services, unadjusted); one per warehouse plus one account monitor; only ACCOUNTADMIN creates and assigns them. [UG:resource-monitors, UG:security-access-control-privileges]
- Suspend below quota (`TRIGGERS ON 90 PERCENT DO SUSPEND`) since suspension lags; one warehouse per monitor for strict caps. [UG:resource-monitors, SQL:sql/create-resource-monitor]
- Budgets cover warehouses, serverless, and AI: account budget plus up to 100 custom budgets; alert-only unless custom actions call owner's-rights, idempotent procedures; refresh lag up to 6.5 h. [UG:budgets, UG:budgets/custom-actions]
- Shared-warehouse chargeback: a user-tag budget with `ADD_SHARED_RESOURCE('WAREHOUSE', ...)` counts only user-attributable query cost (no idle time or tasks). [UG:budgets/budget-shared-resources-warehouses]

## Attribution and billing data

- Object-tag warehouses and users (e.g., `cost_center`); set `QUERY_TAG` per job on shared service connections. [UG:cost-attributing, U]
- `QUERY_ATTRIBUTION_HISTORY` (8 h lag): per-query warehouse credits, excluding idle, cloud services, serverless, AI tokens, queries <= ~100 ms, and Adaptive (`QUERY_METERING_HISTORY`); sum procedures by `ROOT_QUERY_ID`. [SQL:account-usage/query_attribution_history]
- Idle credits = `WAREHOUSE_METERING_HISTORY` `CREDITS_USED_COMPUTE` - `CREDITS_ATTRIBUTED_COMPUTE_QUERIES` (NULL for Adaptive). [SQL:account-usage/warehouse_metering_history]
- Cloud services bill only above 10% of that UTC day's warehouse credits; billed truth is `METERING_DAILY_HISTORY.CREDITS_BILLED`, not `CREDITS_USED`. [UG:cost-understanding-compute, SQL:account-usage/metering_daily_history]
- Serverless features bill per-second compute-hours at per-feature rates, cloud services included. [UG:cost-understanding-compute]
- Lag: ACCOUNT_USAGE metering/load up to 3 h (365-day retention); ORGANIZATION_USAGE `WAREHOUSE_METERING_HISTORY` 24 h, `USAGE_IN_CURRENCY_DAILY` 72 h, revised until month close. [SQL:account-usage, SQL:organization-usage]
- Snowsight Admin > Cost management: weekly Optimization insights, Budgets, Anomalies. [UG:cost-insights, UG:cost-anomalies]

## Privileges

- Workload roles get `USAGE` and `MONITOR`; grant `OPERATE`, `MODIFY` (size, `AUTO_SUSPEND`), and `CREATE WAREHOUSE` only to a warehouse-admin role; `MANAGE WAREHOUSES` grants MODIFY/MONITOR/OPERATE on all. [UG:security-access-control-privileges, BLOG:managing-snowflakes-compute-resources]
