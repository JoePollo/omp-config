# Terraform modules & versions
Tags → skill://terraform/sources.md.

## Design
- A module is an architectural unit (identity + role assignments; catalog + schemas + grants), never a thin wrapper around one resource. [HC:language/modules/develop, AWS:structure]
- Local modules live in `modules/<name>/`, called by relative path; the root composes them and the tree stays flat. [HC:language/modules/develop/structure, HC:language/modules/develop/composition]
- Modules stay generic; root files only wire them (house: one data-admin-rbac root file per persona). [DAR:.github/instructions/data-admin-rbac.instructions.md]
- Dependency inversion: take IDs or objects as inputs; no create-or-look-up toggles inside a module. [HC:language/modules/develop/composition]
- Files: `main.tf`, `variables.tf`, `outputs.tf`, `versions.tf` (or the repo's existing name, e.g. `providers.tf`); `README.md` for modules shared beyond one repo. [HC:language/modules/develop/structure, AVM:TFNFR39]
- Output the IDs and names callers need; re-export child-module outputs explicitly. [GCP:reusable-modules, AWS:structure]
- A new resource in an existing module sits behind a default-off toggle when callers must not see it appear in their plans. [AVM:TFNFR34]

## Providers in modules
- Never a `provider` block in a child module: it blocks `for_each`/`count`/`depends_on` on the call and must outlive every resource it manages. [HC:language/modules/develop/providers]
- Every module declares `required_providers` (`source` + `version`) for each provider it uses; aliased needs add `configuration_aliases = [databricks.workspace]`. [HC:language/modules/develop/providers, AVM:TFNFR27]
- Callers pass aliases explicitly: `providers = { databricks.workspace = databricks.workspace }`; aliases never inherit. [HC:language/meta-arguments/providers]
- Root `providers.tf`: default configuration first, then aliases. [HC:language/style]

## Versions & lock file
- Existing constraints keep the repo's style (`= x.y.z`, `~> 4.0`, `>= 1.9.0`); change them only when asked. [U]
- New constraints are exact: `required_version = "= 1.16.4"` (the CLI the pipeline installs) and `version = "= 1.129.0"`, the same version in the root and every local module. [U]
- Choosing a new pin: the version sibling repos already pin; else the newest release within the major the repos use (registry JSON `version`); a new major (azurerm 5.x) only when asked. [U, REG:hashicorp/azurerm]
- Commit `.terraform.lock.hcl` in every root (astro-admin-rbac lacks one); child modules carry none. [HC:language/files/dependency-lock]
- Upgrades are one deliberate change: bump every pin, `terraform init -backend=false -upgrade`, commit the lock-file diff, read the changelog or upgrade guide. [HC:language/files/dependency-lock, AWS:version]
- Registry modules: exact `version`; Git modules: `?ref=<tag or commit>`; review source, required providers, and nested modules before adopting. [HC:language/expressions/version-constraints, HC:language/block/module, TFLINT, AWS:community]
