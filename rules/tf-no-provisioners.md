---
description: "Avoid provisioners; use provider resources, and terraform_data instead of null_resource"
condition:
  - '(?m)^[ \t]*provisioner[ \t]+"'
  - '(?m)^[ \t]*resource[ \t]+"null_resource"'
scope: "tool:edit(*.tf), tool:write(*.tf)"
interruptMode: never
---
Terraform can't model provisioner behavior; a failed create-time provisioner taints the resource and forces replacement.

- First choice: a provider resource or data source for the task, or a pipeline step outside Terraform.
- Unavoidable: `terraform_data` (built-in, no provider) with `triggers_replace`, not `null_resource`; destroy-time commands must be safe to rerun.

Details: skill://terraform/language.md.
