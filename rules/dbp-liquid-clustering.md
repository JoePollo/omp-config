---
description: "New Delta tables use liquid clustering, not partitioning or ZORDER"
condition:
  - '\bZORDER\s+BY\b'
  - '\bPARTITIONED\s+BY\b'
  - '\.write(?:Stream)?\b[\s\S]{0,300}?\.partitionBy\('
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: never
---
New tables, streaming tables, and materialized views: liquid clustering; never `ZORDER`; partition only a quarantine routing table on `is_quarantined`.

## Avoid

```sql
CREATE TABLE sales (id BIGINT, sale_date DATE) PARTITIONED BY (sale_date);
OPTIMIZE sales ZORDER BY (id);
```

## Use

```sql
CREATE TABLE sales (id BIGINT, sale_date DATE) CLUSTER BY AUTO;
CREATE OR REFRESH STREAMING TABLE events CLUSTER BY (event_date, region) AS SELECT * FROM STREAM(raw_events);
ALTER TABLE legacy_sales REPLACE PARTITIONED BY WITH CLUSTER BY (sale_date);
```

Python: `dp.create_streaming_table(name=..., cluster_by_auto=True)` or `@dp.table(cluster_by=["event_date"])`. `REPLACE PARTITIONED BY WITH CLUSTER BY` needs DBR 18.1+ and doesn't apply to pipeline datasets (change their definition). Keys: skill://databricks-platform/delta-tables.md.
Exception: existing partitioned or Z-ordered tables and frozen/legacy code without a migration request; non-Delta file exports.
