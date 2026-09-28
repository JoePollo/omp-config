---
description: "Dynamic tables state REFRESH_MODE explicitly; AUTO resolves once at create"
condition:
  - '(?i)\bCREATE\s+(?:OR\s+(?:REPLACE|ALTER)\s+)?(?:TRANSIENT\s+)?DYNAMIC\s+(?:ICEBERG\s+)?TABLE\b(?![\s\S]{0,1500}?\bREFRESH_MODE\s*=\s*(?:ADAPTIVE|INCREMENTAL|FULL|CUSTOM_INCREMENTAL)\b)'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: tool-only
---

Production dynamic tables set `REFRESH_MODE` (`ADAPTIVE` when the query is incrementalizable, else `INCREMENTAL` or `FULL`) and a duration `TARGET_LAG` on leaf tables (`DOWNSTREAM` on intermediates). `AUTO` resolves once at create, never to `ADAPTIVE`, and later fails instead of falling back.

## Avoid

```sql
CREATE OR REPLACE DYNAMIC TABLE daily_orders TARGET_LAG = '1 hour' WAREHOUSE = transform_wh AS SELECT ...;
```

## Use

```sql
CREATE OR ALTER DYNAMIC TABLE daily_orders
  TARGET_LAG = '1 hour'
  WAREHOUSE = transform_wh
  REFRESH_MODE = ADAPTIVE
  AS SELECT ...;
```

Check `refresh_mode_reason` in `SHOW DYNAMIC TABLES`; change the mode with `CREATE OR ALTER`, not `ALTER`. Details: skill://snowflake/pipelines.md.
Exception: scratch experiments in a developer sandbox.
