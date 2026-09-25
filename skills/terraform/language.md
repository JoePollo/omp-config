# Terraform language
Tags → skill://terraform/sources.md. Version floors: skill://terraform §Version gates.

## Files & naming
- Existing repos keep their file split (`versions.tf` vs `providers.tf`, `data.tf` use, persona files). New roots: `versions.tf` (`terraform {}`), `providers.tf`, `backend.tf`, `main.tf`, `variables.tf`, `outputs.tf`, `locals.tf`, `data.tf`, plus `imports.tf`/`moved.tf` when needed. [U, HC:language/style, GCP:root-modules, AWS:structure]
- Split large configurations by concern (`grants.tf`, `network.tf`), never one file per resource; data sources sit with their consumers unless shared. [HC:language/style, GCP:general-style-structure, DAR:.github/instructions/data-admin-rbac.instructions.md]
- Identifiers are lowercase `snake_case` nouns that never repeat the type, even abbreviated (`azurerm_resource_group.this`, not `.rg`); `this` for a module's sole resource of a type. [HC:language/style, BAB:naming, AVM:TFNFR4]
- Plural names for collections; positive booleans (`encryption_enabled`); units in numeric names (`retention_days`, `disk_size_gb`). [BAB:naming, GCP:general-style-structure, AWS:structure]
- Azure-facing resource names follow skill://terraform/azure.md §Naming & tags, not HCL identifier rules. [BAB:naming, CAF:resource-naming]
- `#` comments only for non-obvious intent (`depends_on`, `ignore_changes`, instance-generation tricks). [HC:language/style, TFLINT]

## Variables
- Every variable: `description`, then an exact `type` including element types (`map(object({...}))`, `set(string)`); `any` only for opaque pass-through. [HC:language/style, HC:language/expressions/type-constraints, GW]
- Defaults only for environment-independent optional inputs; environment-specific values (IDs, names, SKUs) come from tfvars. [GCP:general-style-structure, AWS:structure]
- Optional object attributes: `optional(type, default)`, not null checks downstream. [HC:language/expressions/type-constraints, AVM:TFNFR21]
- `nullable = false` when null has no meaning; empty-collection defaults (`{}`, `[]`) when empty means none. [HC:language/block/variable, AVM:TFNFR20, AVM:TFNFR21]
- `validation` for real invariants (`env`, ID formats, allowed permissions) with a full-sentence `error_message` naming the rule. [HC:language/validate, DIAC:variables.tf]
- Secrets: `sensitive = true` and no non-empty default; keeping them out of state: skill://terraform/security.md. [HC:language/block/variable, AVM:TFNFR23]
- Expose inputs only with a real variation need; fixed literals are locals. [GCP:general-style-structure, AWS:structure]

## Outputs
- Every output has a `description` and derives from resource attributes (IDs, names); never echo inputs or whole resource objects. [HC:language/style, GCP:general-style-structure, AVM:TFFR2]
- Secret outputs `sensitive = true`; handoff artifacts carry only non-secret outputs (house: `principal_registry`). [HC:language/block/output, DAR:README.md]
- A consumed output is an interface: add the new name, keep the old until consumers move. [AVM:TFNFR30]

## Locals & expressions
- A local names a repeated or complex expression; no single-use indirection. Shared locals in `locals.tf`, file-specific ones at the top of their file. [HC:language/style]
- One conditional per expression; split nested ternaries into named locals. [GCP:general-style-structure]
- JSON/YAML via `jsonencode()`/`yamlencode()` over HCL objects; templates in `templates/*.tftpl` through `templatefile()`. [AVM:TFNFR40, GCP:general-style-structure]
- `try()` for optional lookups, not `element(concat(...))` or two-argument `lookup()`. [BAB:naming, TFLINT]
- Locals keep precise types: numbers and bools, not strings. [AVM:TFNFR33]

## Iteration
- Repeated instances: `for_each` over a map or set keyed by stable, plan-time-known names; never `count = length(list)` (an insert shifts indexes and replaces objects). [HC:language/meta-arguments/for_each, AVM:TFNFR7]
- `count` only for an on/off singleton: `count = var.feature_enabled ? 1 : 0`. [GCP:general-style-structure, AVM:TFNFR7]
- `for_each` keys are never sensitive and never derived from apply-time attributes; use input keys. [HC:language/meta-arguments/for_each, AVM:interfaces]
- Switching singleton ↔ `count` ↔ `for_each` or changing keys: one `moved` block per existing instance. [HC:language/modules/develop/refactoring]
- `dynamic` blocks only for optional or input-driven nested blocks; static blocks stay literal. [HC:language/expressions/dynamic-blocks, AVM:TFNFR35]
- `depends_on` only for hidden dependencies, with a comment saying why; otherwise references. [HC:language/meta-arguments/depends_on, GCP:dependency-management]

## Conditions
| need | use | min |
|---|---|---|
| reject bad input | `variable` `validation` | 0.13; cross-object 1.9 |
| assumption before create or read | `lifecycle { precondition {} }` | 1.2 |
| guarantee after create or read | `lifecycle { postcondition {} }` | 1.2 |
| non-blocking health signal | `check {}` (warns, never fails) | 1.5 |
| fail closed on external input (house) | `terraform_data` guard with preconditions (Databricks-IaC `registry_guard`) | — |

[HC:language/validate, DIAC:registry.tf]
- Error messages say what failed, the offending value, and the fix. [HC:language/validate]

## Scripts & provisioners
- Provider resources first; provisioners (`local-exec`, `remote-exec`, `file`) only after exhausting alternatives: Terraform can't model them, and a failed create-time provisioner taints the resource. [HC:language/provisioners, GCP:working-with-resources]
- Lifecycle container for values or triggers: built-in `terraform_data`, not `null_resource`. [HC:language/resources/terraform-data]
