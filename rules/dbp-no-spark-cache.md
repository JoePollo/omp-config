---
description: "Don't Spark-cache Delta tables or DataFrames"
condition:
  - '\.cache\(\s*\)'
  - '\.persist\('
  - '\bCACHE\s+(?:LAZY\s+)?TABLE\b'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: never
---
Spark caching on Delta loses data skipping for filters applied later and can serve stale data when the table is read through another identifier.

## Avoid

```python
orders = spark.read.table("dwh_dev.silver.orders").cache()
```

## Use

```python
orders = spark.read.table("dwh_dev.silver.orders").where("order_date >= '2026-01-01'")
```

Exception: `.cache()`/`.persist()` on non-Spark objects. Details: skill://databricks-platform/delta-tables.md.
