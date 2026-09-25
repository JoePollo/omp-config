# Terraform state, refactoring, lifecycle
Tags → skill://terraform/sources.md.

## State & backend
- azurerm backend with Blob lease locking; one key per root per environment (`<env>-<component>-NN.tfstate`) passed at `terraform init -backend-config=key=…`; no credentials in the `backend` block or `-backend-config`. [HC:language/backend/azurerm, HC:language/backend, U]
- Entra ID auth: `use_azuread_auth = true` with OIDC or managed identity; never storage access keys or SAS tokens; the runner needs `Storage Blob Data Contributor`. [HC:language/backend/azurerm]
- Never edit, commit, pull, or push state; never break a Blob lease or `force-unlock` a lock another run may hold; report the lock ID and let a human decide. [HC:language/state, HC:language/state/locking, HC:cli/commands/force-unlock]
- Environments never share a key; a new environment or component gets its own key, never a CLI workspace. [HC:language/state/workspaces, AWS:backend]
- Split state by blast radius and ownership; shared singletons get their own root and key (house: `data-admin-rbac/metastore`). [HC:cloud-docs/workspaces/best-practices, DAR:metastore/README.md]
- Cross-root values: a non-secret output artifact or a provider data source, never `terraform_remote_state` (it exposes the whole snapshot; house: the `principal_registry` artifact). [HC:language/style, DIAC:.github/index.md]

## Refactor without destroy
| change | block | min |
|---|---|---|
| rename; move into or out of a module; singleton ↔ `count` ↔ `for_each`; key change | `moved { from = … to = … }` | 1.1 |
| adopt existing objects | `import { to = … id = … }`, `for_each` for many | 1.5; `for_each` 1.7 |
| stop managing, keep the object | `removed { from = … lifecycle { destroy = false } }` | 1.7 |
| retire the object | delete its block; the plan shows the destroy | — |

- House files: `moved.tf` grouped by migration with explicit old → new addresses; `imports.tf`, whose blocks are deleted once dev, tst, and prd have each applied them. [DAR:moved.tf, DAR:imports.tf]
- Conditional adoption (Databricks-IaC): `for_each = var.import_existing_resources ? … : toset([])`, switched on by `tfvars/<env>-import.tfvars`. [DIAC:imports.tf]
- `moved` blocks in shared modules stay until every caller has applied; removing one is breaking. [HC:language/modules/develop/refactoring]
- Import IDs are provider-specific: read the resource's Import section at the pinned version. [HC:language/block/import]
- `plan -generate-config-out=<new file>` is a live plan (only when the user runs or requests it); its output is a draft to rewrite to repo conventions before committing. [HC:language/import/generating-configuration]
- After `removed` with `destroy = false`, ensure no root recreates or re-imports the object unintentionally. [HC:cli/commands/state/rm]
- Never `terraform state mv`/`rm`, `taint`, or `refresh`: the blocks above, `-replace=ADDR`, and `plan -refresh-only`, reviewed in the pipeline, replace them. [HC:cli/commands/state/mv, HC:cli/commands/taint, HC:cli/commands/refresh]

## lifecycle
- `prevent_destroy` on objects whose loss breaks the platform (house: the deploy identity's workspace assignment); it guards only while the block exists. [HC:language/meta-arguments/lifecycle, DAR:deploy_identity.tf]
- `create_before_destroy` only when old and new objects can coexist (unique names clash). [HC:language/meta-arguments/lifecycle]
- `ignore_changes` lists specific attributes another owner manages, with a comment naming the owner; never `all`. [HC:language/meta-arguments/lifecycle, ATP:modules/key-vault/main.tf]
- `replace_triggered_by` takes resource references; wrap plain values in `terraform_data`. [HC:language/meta-arguments/lifecycle, HC:language/resources/terraform-data]

## Drift
- Inspect drift with a pipeline `plan -refresh-only`, then per attribute codify the external change or let apply revert it. [HC:cli/commands/plan, HC:cloud-docs/workspaces/health]
- Never `-refresh=false` in normal plans. [HC:cli/commands/plan]
