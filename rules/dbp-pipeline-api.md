---
description: "Lakeflow pipelines use pyspark.pipelines (dp), AUTO CDC, CREATE OR REFRESH; dlt, LIVE, APPLY CHANGES are legacy"
condition:
  - '\bimport\s+dlt\b'
  - '\bfrom\s+dlt\s+import\b'
  - '@dlt\.'
  - '\bdlt\.(?:read|read_stream|apply_changes|apply_changes_from_snapshot|create_target_table|create_streaming_live_table|create_streaming_table|append_flow|create_sink|expect\w*|table|view)\b'
  - '\bAPPLY\s+CHANGES\s+INTO\b'
  - '\bLIVE\s+(?:TABLE|VIEW)\b'
  - '\b(?:FROM|JOIN)\s+LIVE\.\w'
  - '\bSTREAM\s*\(\s*LIVE\.\w'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: never
---
New pipeline code uses `pyspark.pipelines` and current SQL; `dlt`, `LIVE`, and `APPLY CHANGES` still run but are legacy.

| legacy | current |
|---|---|
| `import dlt` | `from pyspark import pipelines as dp` |
| `@dlt.table` (streaming / batch DataFrame) | `@dp.table` / `@dp.materialized_view` |
| `@dlt.view` | `@dp.temporary_view` |
| `@dlt.expect*`, `@dlt.append_flow`, `dlt.create_sink()` | `@dp.expect*`, `@dp.append_flow`, `dp.create_sink()` |
| `dlt.create_target_table()`, `dlt.create_streaming_live_table()` | `dp.create_streaming_table()` |
| `dlt.apply_changes()`, `dlt.apply_changes_from_snapshot()` | `dp.create_auto_cdc_flow()`, `dp.create_auto_cdc_from_snapshot_flow()` |
| `dlt.read("x")`, `dlt.read_stream("x")` | `spark.read.table("x")`, `spark.readStream.table("x")` |
| `APPLY CHANGES INTO` | `AUTO CDC INTO` |
| `CREATE OR REFRESH LIVE TABLE` | `CREATE OR REFRESH MATERIALIZED VIEW` |
| `FROM LIVE.orders`, `STREAM(LIVE.orders)` | `FROM orders`, `STREAM(orders)` (names resolve in the pipeline's catalog/schema) |

Details: skill://databricks-platform/pipelines.md.
Exception: edits inside an existing `dlt` pipeline without a migration request; match its style and suggest the migration.
