---
description: "New version constraints are exact pins; existing constraints keep the repo's style"
condition:
  - '(?m)^[ \t]*(?:required_version|version)[ \t]*=[ \t]*"[ \t]*(?:~>|>=|<=|!=|>|<)'
scope: "tool:edit(*.tf), tool:write(*.tf)"
interruptMode: never
---
House policy for new constraints (new roots, new modules, newly added providers): exact pins everywhere.

## Avoid

```hcl
azurerm = {
  source  = "hashicorp/azurerm"
  version = "~> 4.0"
}
```

## Use

```hcl
azurerm = {
  source  = "hashicorp/azurerm"
  version = "= 4.81.0"
}
```

- `required_version = "= X.Y.Z"` equals the CLI the pipeline installs.
- One version per provider across the root and every local module; commit `.terraform.lock.hcl`.
- A constraint already present in an existing repo keeps its style unless the user asks to change it.

Details: skill://terraform/modules.md.
