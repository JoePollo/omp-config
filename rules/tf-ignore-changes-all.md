---
description: "Scope ignore_changes to named attributes another owner manages, never all"
condition:
  - '\bignore_changes[ \t]*=[ \t]*all\b'
scope: "tool:edit(*.tf), tool:write(*.tf)"
interruptMode: never
---
`ignore_changes = all` hides every future drift and configuration change on the resource.

## Avoid

```hcl
lifecycle {
  ignore_changes = all
}
```

## Use

```hcl
lifecycle {
  # The pipeline firewall step toggles default_action during deployments.
  ignore_changes = [network_acls[0].default_action]
}
```

Details: skill://terraform/state.md.
