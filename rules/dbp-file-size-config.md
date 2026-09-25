---
description: "UC managed tables auto-tune file size; drop legacy auto-optimize and target-size settings"
condition:
  - 'spark\.databricks\.delta\.(?:autoCompact|optimizeWrite)\.enabled'
  - '\bautoOptimize\.(?:autoCompact|optimizeWrite)\b'
  - '\btargetFileSize\b'
scope: "tool:edit(*.{sql,py,ipynb,yml,yaml,json,tf}), tool:write(*.{sql,py,ipynb,yml,yaml,json,tf})"
interruptMode: never
---
Unity Catalog managed tables tune file size and run background auto compaction; legacy settings block newer defaults.

## Avoid
- `spark.databricks.delta.autoCompact.enabled`, `spark.databricks.delta.optimizeWrite.enabled` in session or cluster config.
- Table properties `delta.autoOptimize.autoCompact`, `delta.autoOptimize.optimizeWrite`, `delta.targetFileSize` on managed tables (there only `OPTIMIZE` honors `targetFileSize`).

## Use
- On upgrade remove them: `ALTER TABLE t UNSET TBLPROPERTIES (delta.autoOptimize.autoCompact)`.
- Predictive optimization for `OPTIMIZE`/`VACUUM`; liquid clustering for layout.

Exception: external or legacy tables use auto compaction `auto` and optimized writes; `targetFileSize` only for a measured need. Details: skill://databricks-platform/delta-tables.md.
