---
description: "Snowflake cost guards: suspending compute, scoped search optimization, result reuse"
condition:
  - '(?i)\bAUTO_SUSPEND\s*=\s*(?:0|NULL)\b'
  - '(?i)\bAUTO_SUSPEND_SECS\s*=\s*0\b'
  - '(?i)\bADD\s+SEARCH\s+OPTIMIZATION\b(?!\s+ON\b)'
  - '(?i)\bALTER\s+(?:ACCOUNT|USER\s+\S+)\s+SET\s+USE_CACHED_RESULT\s*=\s*(?:FALSE|0)\b'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: tool-only
---

Keep idle compute suspending and serverless optimizations scoped.

| avoid | use |
|---|---|
| warehouse `AUTO_SUSPEND = 0` or `NULL` (never suspends) | `AUTO_SUSPEND = 60` for tasks, ~`300` ad hoc, `600`+ for BI caches; `AUTO_RESUME = TRUE` |
| compute pool `AUTO_SUSPEND_SECS = 0` (GPU and CPU nodes bill while idle) | `AUTO_SUSPEND_SECS` sized to the idle gap (default 3600) |
| `ALTER TABLE t ADD SEARCH OPTIMIZATION` (every eligible column, including future ones) | `ADD SEARCH OPTIMIZATION ON EQUALITY(c1), SUBSTRING(c2)` after `SYSTEM$ESTIMATE_SEARCH_OPTIMIZATION_COSTS` |
| `ALTER USER etl_svc SET USE_CACHED_RESULT = FALSE` | default `TRUE`; `ALTER SESSION SET USE_CACHED_RESULT = FALSE` only while benchmarking |

Details: skill://snowflake/warehouses.md, skill://snowflake/performance.md, skill://snowflake/ml-models.md.
Exception: a documented steady 24×7 workload where suspension costs more than idle time.
