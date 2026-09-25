---
description: "Environments are tfvars plus one state key per environment, not CLI workspaces"
condition:
  - '\bterraform\.workspace\b'
scope: "tool:edit(*.tf), tool:write(*.tf)"
interruptMode: never
---
CLI workspaces share one backend configuration and credentials, so they can't isolate dev, tst, and prd.

## Avoid

```hcl
locals {
  env = terraform.workspace
}
```

## Use

```hcl
variable "env" {
  description = "Deployment environment."
  type        = string

  validation {
    condition     = contains(["dev", "tst", "prd"], var.env)
    error_message = "env must be dev, tst, or prd."
  }
}
```

- The pipeline passes `-var-file=<env tfvars>` and `-backend-config=key=<env>-<component>.tfstate`.

Details: skill://terraform/state.md.
