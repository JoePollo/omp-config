---
description: "New Databricks tables use liquid clustering, not partitioning or Z-order"
condition:
  - '(?i)\bPARTITIONED\s+BY\b'
  - '(?i)\bZORDER\s+BY\b'
  - '\.write(?:Stream)?\b[\s\S]{0,300}?\.partitionBy\s*\('
scope: "tool:edit(*.sql), tool:write(*.sql), tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
New tables: `CLUSTER BY` (liquid clustering); never `PARTITIONED BY` or `ZORDER`.

## Avoid

```sql
CREATE TABLE dwh_dev.silver.<satellite> (...) PARTITIONED BY (<load_date>);
OPTIMIZE dwh_dev.silver.<satellite> ZORDER BY (<parent_hash_key>);
```

## Use

```sql
CREATE TABLE dwh_dev.silver.<satellite> (...) CLUSTER BY (<parent_hash_key>);
```

- Raw Vault: cluster by hub/link hash key or satellite parent hash key; other tables: dominant filter columns (≤4), else `CLUSTER BY AUTO`.
- Predictive optimization runs `OPTIMIZE`; without it schedule `OPTIMIZE` every 1–2 h on busy tables.

## Exceptions
- Converting an existing partitioned table on request: `ALTER TABLE ... REPLACE PARTITIONED BY WITH CLUSTER BY` (DBR 18.1+).
- Legacy-origin models (skill://databricks-silver-modeling § Gate).
