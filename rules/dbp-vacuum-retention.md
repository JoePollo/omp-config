---
description: "Keep VACUUM retention at least 7 days; never disable the retention check"
condition:
  - '\bRETAIN\s+\d+\s+HOURS\b'
  - '\bretentionDurationCheck\.enabled\b'
  - '\bdeletedFileRetentionDuration\b'
scope: "tool:edit(*.{sql,py,ipynb,yml,yaml,json,tf}), tool:write(*.{sql,py,ipynb,yml,yaml,json,tf})"
interruptMode: never
---
`VACUUM` deletes unreferenced files older than retention (default 7 days = 168 hours) and the time travel they back; shorter retention breaks transactions and streams that run longer than it.

## Avoid

```sql
SET spark.databricks.delta.retentionDurationCheck.enabled = false;
VACUUM events RETAIN 0 HOURS;
```

## Use
- Managed tables: predictive optimization runs `VACUUM`.
- Longer history: `ALTER TABLE t SET TBLPROPERTIES ('delta.deletedFileRetentionDuration' = '30 days')` before enabling predictive optimization.
- Physically purge deleted rows: `REORG TABLE t APPLY (PURGE)`, then `VACUUM t`.

Exception: retention under 7 days only after confirming no operation outlives it. Details: skill://databricks-platform/delta-tables.md.
