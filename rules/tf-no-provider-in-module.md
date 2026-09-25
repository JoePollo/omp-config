---
description: "No provider blocks in child modules; declare required_providers and receive aliases"
condition:
  - '(?m)^[ \t]*provider[ \t]+"[A-Za-z0-9_-]+"[ \t]*\{'
scope: "tool:edit(**/modules/**/*.tf), tool:write(**/modules/**/*.tf)"
interruptMode: never
---
A child module with its own `provider` block can't be called with `for_each`, `count`, or `depends_on`, and its configuration must outlive every resource it manages.

## Avoid

```hcl
provider "databricks" {
  host = var.workspace_host
}
```

## Use

```hcl
terraform {
  required_providers {
    databricks = {
      source                = "databricks/databricks"
      version               = "= 1.129.0"
      configuration_aliases = [databricks.workspace]
    }
  }
}
```

- Caller: `providers = { databricks.workspace = databricks.workspace }`.
- Provider configuration lives in the root `providers.tf`.

Details: skill://terraform/modules.md.
