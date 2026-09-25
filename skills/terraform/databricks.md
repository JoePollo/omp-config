# Databricks provider (house: data-admin-rbac, Databricks-IaC)
Tags → skill://terraform/sources.md. Unity Catalog privilege semantics: skill://databricks-platform/unity-catalog.md. Read the repo's `.github/copilot-instructions.md` and `.github/index.md` first; they win.

## Ownership
| object | owner |
|---|---|
| Azure identities, Databricks account SPs and groups, membership, workspace admission, entitlements, `principal_registry` | `data-admin-rbac` (per environment) |
| `system` catalog key; grants on `system.information_schema`, `system.ai`, `system.__internal_ai` | `data-admin-rbac/metastore` (apply-once state) |
| catalogs, schemas, volumes, external locations, storage credentials, connections, compute, workspace ACLs, UC grants | `Databricks-IaC` (per environment) |
| jobs, pipelines, dashboards, alerts, and their permissions | the data_platform bundle, never Terraform |

[DAR:.github/copilot-instructions.md, DIAC:.github/copilot-instructions.md, DIAC:.github/index.md]

## Provider
- Aliases: `databricks.account` (account host + `account_id`) for account objects (account SPs and groups, `databricks_mws_permission_assignment`, metastore assignment); `databricks.workspace` (workspace host) for workspace objects; pass the alias to every module and resource. [DBX:index, DBX:guides/troubleshooting, DBX:guides/unity-catalog-azure]
- Auth stays out of HCL: Azure CLI locally; OIDC/workload identity or `azure-msi` in pipelines; no PATs; `auth_type` only to break ambiguity. [DBX:index, DBX:guides/azure-authenticate-with-oidc]
- Account ID and hosts come from variables, not literals. [DBX:index, U]
- House pin `= 1.129.0` in both repos' roots and modules; bump both repos together. [DAR:providers.tf, DIAC:providers.tf, U]

## Grants & permissions
- `databricks_grants` (per securable) and `databricks_permissions` (per object) are authoritative: one instance per securable or object, overwriting all other access on it; never a second instance or a `databricks_grant` on the same target. [DBX:resources/grants, DBX:resources/permissions]
- `databricks_grant` owns one principal's grants on a securable, additive to others (house: only the Terraform SP's metastore grant in data-admin-rbac). [DBX:resources/grant, DAR:databricks_tf_spn.tf]
- Adopt existing grants or permissions with `import` before managing them, or the first apply removes out-of-band access. [DBX:resources/grants, DBX:resources/permissions]
- Catalog and schema grants inherit to children: grant at the narrowest scope. [DBX:resources/grants]
- House manifest: Databricks-IaC `unity_catalog_permissions` in `tfvars/<env>.tfvars`; principals resolve through `principal_registry` keys; broad principals, UUID principals, `ALL_PRIVILEGES`, and direct users other than RBAC `entra_user` exceptions are rejected by validation and `terraform_data.registry_guard`. [DIAC:.github/index.md, DIAC:registry.tf]
- `databricks_secret_acl` is additive: Terraform can't prove an ACL's absence. [DIAC:.github/copilot-instructions.md]

## Principals (data-admin-rbac)
- People reach workspaces through SCIM-synced Entra groups; no human members in Terraform; direct users only for break-glass `admins` and `direct_user_exceptions`. [DAR:.github/copilot-instructions.md]
- Workspace SPs are Azure-backed; Databricks-native SPs only as `databricks_native` entries in `additional_databricks_principals`. [DAR:.github/copilot-instructions.md]
- Native groups only for processes with several identities (ELS slots); single identities are granted directly. [DAR:.github/copilot-instructions.md]
- Account SP deletion defaults to deactivation: set the delete behavior deliberately; house retirement is two-phase through `retired_workspace_principals`. [DBX:resources/service_principal, DAR:variables.tf]
- Account identities join workspaces through `databricks_mws_permission_assignment` on the account provider. [DBX:resources/mws_permission_assignment]

## Adoption
- The exporter (experimental) only inventories existing workspaces; its HCL and imports are drafts; it skips bundle-managed jobs, which stay out of Terraform. [DBX:guides/experimental-exporter]
