---
description: "Grant Unity Catalog privileges to groups, not users; Terraform owns managed grants"
condition:
  - '(?i)\bGRANT\b[^;]{0,300}?\bTO\s+`[^`]*@[^`]*`'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: never
---
Unity Catalog grants go to IdP-managed groups (service principals for jobs), never individual users; `ALL PRIVILEGES` and `MANAGE` sparingly.

## Avoid

```sql
GRANT SELECT ON SCHEMA dwh_prd.silver TO `someone@example.com`;
```

## Use

```sql
GRANT USE SCHEMA, SELECT ON SCHEMA dwh_prd.silver TO `Data Platform Engineering`;
```

- Direct `MODIFY` on production tables: service principals only.
- Terraform-managed securables (`unity_catalog_permissions` in Databricks-IaC, `system` grants in data-admin-rbac/metastore): change the Terraform grant manifest; `databricks_grants` is authoritative, so an ad-hoc `GRANT` is drift and reverted on the next apply.

Details: skill://databricks-platform/unity-catalog.md.
