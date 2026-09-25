---
name: terraform
description: Terraform domain knowledge base (HashiCorp language and CLI guidance, azurerm/azuread/azapi, Databricks and Astro providers, Azure DevOps pipelines, house repo conventions). Routed by rule://domain-router.
hide: true
---
# Terraform KB
Defaults only: explicit instructions, AGENTS.md, repo guidance (`.github/copilot-instructions.md`, `.github/instructions/*.md`, `.github/index.md`, `README.md`), and existing repo conventions win; skill://databricks-platform owns Unity Catalog privilege semantics. Read every topic whose trigger matches. Tags → skill://terraform/sources.md.

## Topics
| trigger | read |
|---|---|
| variables, outputs, locals, `count`/`for_each`, `dynamic`, validation, pre/postconditions, `check`, naming, file layout, provisioners | skill://terraform/language.md |
| `modules/`, module calls, `required_providers`, provider aliases, version constraints, `.terraform.lock.hcl`, registry/Git module sources | skill://terraform/modules.md |
| backend, state keys, `moved`/`import`/`removed`, `lifecycle`, renames, adoption, retirement, drift | skill://terraform/state.md |
| secrets, `sensitive`, `ephemeral`, write-only `*_wo`, credentials, Key Vault, tokens, `.gitignore`, deploying identities | skill://terraform/security.md |
| `.azure-pipelines/**` running terraform, plan/approval/apply, service connections, OIDC, promotion | skill://terraform/pipelines.md |
| `*.tftest.hcl`, `terraform test`, mocks, `validate`, lint/scan tools, policy checks | skill://terraform/testing.md |
| `azurerm`, `azuread`, `azapi`, Azure naming/tags, role assignments, managed identities, azurerm 4 → 5 | skill://terraform/azure.md |
| `databricks` provider, account vs workspace, grants, permissions, principals, data-admin-rbac, Databricks-IaC | skill://terraform/databricks.md |
| `astro` provider, Astro deployments/workspaces/teams/tokens, astro-tf-platform, astro-admin-rbac | skill://terraform/astro.md |

## Core
- Existing repos: keep their layout, naming, constraint style, and pipeline shape; change only what the task needs; propose retrofits of §Local platform anti-patterns, never apply them unasked. [U]
- Work statically: `terraform fmt`, `terraform init -backend=false -input=false`, `terraform validate`; never run `plan`, `apply`, `import`, `state`, `refresh`, `output`, `force-unlock`, or a backend `init` against live state or cloud APIs unless the user explicitly asks for that command. [U, DIAC:.github/copilot-instructions.md, DAR:README.md]
- Change infrastructure only through reviewed configuration the pipeline plans: `import`, `moved`, `removed` blocks, never CLI state surgery. [HC:language/modules/develop/refactoring, HC:language/block/removed, HC:cli/commands/state/rm]
- One root per component serves dev, tst, prd: per-environment tfvars, one state key per environment passed at `init`, `env` validated to `dev`/`tst`/`prd`; no CLI workspaces or `terraform.workspace`. [U, HC:language/state/workspaces]
- Providers are configured only in root modules; child modules declare `required_providers` (+ `configuration_aliases`) and receive aliases through `providers = {}`. [HC:language/modules/develop/providers, AVM:TFNFR27]
- New constraints (new root, new module, newly added provider): exact pins: `required_version = "= X.Y.Z"` equal to the pipeline's CLI, `version = "= x.y.z"` identical across the root and every local module; commit `.terraform.lock.hcl`; existing constraints keep their style. [U]
- State and saved plans hold secrets in plaintext; `sensitive` only redacts output; never commit state, plans, `.terraform/`, or secret tfvars. [HC:language/manage-sensitive-data, HC:language/style]
- Check the floor before any version-gated feature (§Version gates); never raise `required_version` unasked. [HC:language/v1-compatibility-promises]
- Tooling is the `terraform` CLI only; tflint, trivy, checkov, terraform-docs, and pre-commit are neither installed nor configured in any repo: never add them unasked. [U]

## Version gates (floor = lowest version `required_version` allows)
| feature | min |
|---|---|
| `moved` blocks | 1.1 |
| `optional()` object attributes with defaults | 1.3 |
| `import` blocks, `check` blocks, `plan -generate-config-out` | 1.5 |
| `terraform test` | 1.6 |
| `removed` blocks, `import` with `for_each`, `mock_provider` and overrides | 1.7 |
| provider-defined functions (`provider::azurerm::…`) | 1.8 |
| `validation` referencing other variables or objects | 1.9 |
| `ephemeral` resources, variables, outputs | 1.10 |
| write-only arguments (`*_wo`) | 1.11 |
| list resources, `terraform query`, actions | 1.14 |
| variables/locals in module `source`/`version`; `deprecated` on variables and outputs | 1.15 |
| `import` inside child modules; resource `lifecycle { destroy = false }`; `terraform_data` `store` | 1.16 |

[TFR:1.1, TFR:1.3, TFR:1.5, TFR:1.6, TFR:1.7, TFR:1.8, TFR:1.9, TFR:1.10, TFR:1.11, TFR:1.14, TFR:1.15, TFR:1.16]

## Workflow
- After each edit batch, in every changed root or module directory: `terraform fmt`, `terraform init -backend=false -input=false`, `terraform validate`; the plan-end quality gate reruns them. [U, DAR:README.md]
- The formatter owns layout; never hand-align or reformat untouched files. [HC:language/style]
- Unsure of a resource's arguments or import ID: read that provider's docs at the pinned version (registry page or the provider repo's `docs/`); never guess. [HAS:terraform-style-guide, HC:language/block/import]
- Summaries name every plan-affecting consequence: replacements, destroys, moves, imports, `removed` blocks, grant or permission removals. [U, HC:tutorials/automation/automate-terraform]

## Local platform (observed 2026-09-25; repo config wins)
| repo | owns | env inputs | state key | pipeline |
|---|---|---|---|---|
| `~/src/astro-admin-rbac` | Astro resource group, user-assigned identity, Azure role assignments | `environments/<env>.tfvars` | `<env>-rbac-astro-01.tfstate` | in-repo `.azure-pipelines/build.yml` |
| `~/src/astro-tf-platform` | Astro deployments, alerts, notification channels, Databricks SP secret | `environments/<env>.tfvars` | tst/prd `<env>-app-astro.tfstate`; dev and previews `preview-<branch>-astro.tfstate` | in-repo `build.yml`, `feature-preview-deploy.yaml`, `feature-preview-delete.yaml` |
| `~/src/data-admin-rbac` | Azure identities, Databricks account principals and groups, workspace admission and entitlements, `principal_registry`; `metastore/`: `system` grants | `tfvars/<env>/<env>.tfvars`; `metastore/metastore.tfvars` | `<env>-rbac-els-01.tfstate`; `metastore-governance-01.tfstate` | extends `databricks/terraform/apply.yml@templates` |
| `~/src/Databricks-IaC` | workspace infrastructure, UC securables and grants, workspace ACLs, compute, connections | `tfvars/<env>.tfvars`, `tfvars/<env>-import.tfvars` | `<env>-databricks-iac.tfstate` | extends `databricks/terraform/apply.yml@templates` |

[AAR:.azure-pipelines/build.yml, ATP:.azure-pipelines/build.yml, DAR:README.md, DIAC:.github/index.md]
- Shared: azurerm backend, key passed as `terraform init -backend-config=key=…`; ADO parameter `environment` selects tfvars, service connection, and key; no `provider` blocks in modules. [U]
- Known anti-patterns, never copied into new code: `terraform init -upgrade` every run, `TerraformInstaller@1` `latest`, automatic `az storage blob lease break`, refresh-only `apply -auto-approve` without the reviewed plan, preview `apply`/`destroy -auto-approve`, `ARM_CLIENT_SECRET` exports (astro repos); no lock file (astro-admin-rbac); `.gitignore` without state/plan patterns (data-admin-rbac, Databricks-IaC); literal Databricks account ID in the provider block (data-admin-rbac). [U]
