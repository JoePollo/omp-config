---
description: "Unity Catalog only: volumes and three-level names, not DBFS mounts or hive_metastore"
condition:
  - '(?:\bdbfs:|/dbfs)/mnt/'
  - '\bdbutils\.fs\.(?:mount|unmount|updateMount|refreshMounts|mounts)\('
  - '(?i)\bhive_metastore\.'
scope: "tool:edit(*.{sql,py,ipynb,yml,yaml}), tool:write(*.{sql,py,ipynb,yml,yaml})"
interruptMode: never
---
Data and files go through Unity Catalog; DBFS mounts and `hive_metastore` bypass its access control, auditing, and lineage.

| avoid | use |
|---|---|
| `dbutils.fs.mount(...)`, `dbfs:/mnt/landing/...` | `/Volumes/<catalog>/<schema>/<volume>/...` (external volume for landing zones) |
| `hive_metastore.<db>.<table>` | `<catalog>.<schema>.<table>`, e.g. `dwh_dev.bronze.orders` |

Details: skill://databricks-platform/unity-catalog.md.
Exception: maintenance-frozen bundles and `Databricks/legacy/` code that already use them, without a migration request; reading an existing mount or `hive_metastore` object while migrating it.
