---
description: "Don't coalesce/repartition to a fixed count right before Delta writes"
condition:
  - '\.(?:coalesce|repartition)\(\s*\d+\s*\)[\s\\]*\.write'
scope: "tool:edit(*.{py,ipynb}), tool:write(*.{py,ipynb})"
interruptMode: never
---
Optimized writes and auto-tuned file sizes set Delta file counts; `coalesce(n)`/`repartition(n)` just before a write works against them.

## Avoid

```python
df.coalesce(1).write.mode("append").saveAsTable("dwh_dev.bronze.orders")
```

## Use

```python
df.write.mode("append").saveAsTable("dwh_dev.bronze.orders")
```

Exception: non-Delta exports that must produce a fixed number of files. Details: skill://databricks-platform/delta-tables.md.
