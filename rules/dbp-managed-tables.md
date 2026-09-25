---
description: "New tables are Unity Catalog managed: no LOCATION or path option"
condition:
  - '(?i)\bCREATE\b[^;]{0,2000}?\bTABLE\b[^;]{0,2000}?\bLOCATION\s+[''"]'
  - '\.option\(\s*[''"]path[''"]'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: never
---
New tables: Unity Catalog managed (Databricks manages files, layout, and maintenance); external tables only for the documented exceptions.

## Avoid

```sql
CREATE TABLE dwh_dev.bronze.orders (id BIGINT) LOCATION 'abfss://lake@acct.dfs.core.windows.net/orders';
```

## Use

```sql
CREATE TABLE dwh_dev.bronze.orders (id BIGINT) CLUSTER BY AUTO;
```

External only for: in-place Hive metastore upgrade, DR that managed tables can't meet, outside readers/writers (reads only), non-Delta/Iceberg formats. Landing files: external volumes. Convert: `ALTER TABLE t SET MANAGED` (DBR 17.3 LTS+ or serverless). Details: skill://databricks-platform/delta-tables.md.
