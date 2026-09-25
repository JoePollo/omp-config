---
description: "Delta retention stays at or above 7 days; satellites hold history"
condition:
  - '(?i)retentionDurationCheck\.enabled\W{1,6}false'
  - '(?i)deletedFileRetentionDuration\W{1,6}interval\s+(?:[0-6]\s+days?|(?:\d|[1-9]\d|1[0-5]\d|16[0-7])\s+hours?|\d+\s+(?:minutes?|seconds?))\b'
  - '(?i)\bVACUUM\b[^;]*?\bRETAIN\s+(?:\d|[1-9]\d|1[0-5]\d|16[0-7])(?:\.\d+)?\s+HOURS\b'
scope: "tool:edit(*.sql), tool:write(*.sql), tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
Keep Delta deleted-file retention ≥ 7 days; time travel is recovery, satellites are history.

## Avoid

```sql
SET spark.databricks.delta.retentionDurationCheck.enabled = false;
ALTER TABLE dwh_dev.silver.<table> SET TBLPROPERTIES ('delta.deletedFileRetentionDuration' = 'interval 1 hours');
```

## Use

- Default retention: files `interval 1 week`, log 30 days; predictive optimization runs `VACUUM`.
- Long-term history → insert-only satellites.
- Current `VACUUM` syntax has no `RETAIN` clause; retention comes from `delta.deletedFileRetentionDuration`.

## Exceptions
- Legacy-origin models (skill://databricks-silver-modeling § Gate).
