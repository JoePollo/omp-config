---
description: "Share values across roots through non-secret outputs or data sources, not terraform_remote_state"
condition:
  - '\bterraform_remote_state\b'
scope: "tool:edit(*.tf), tool:write(*.tf)"
interruptMode: never
---
`terraform_remote_state` needs read access to the other root's entire state snapshot, secrets included.

- Pass a published non-secret output artifact as a variable (house: `terraform output -json principal_registry` from data-admin-rbac, injected into Databricks-IaC as `principal_registry`).
- Or read the object directly with the provider's data source.

Details: skill://terraform/state.md.
