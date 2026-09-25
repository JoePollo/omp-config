---
description: "Pipelines install an exact Terraform CLI and reuse the committed lock file"
condition:
  - '(?<![\w-])-upgrade\b'
  - '(?i)\bterraformVersion[ \t]*:[ \t]*["'']?latest\b'
scope: "tool:edit(*.{yml,yaml}), tool:write(*.{yml,yaml})"
interruptMode: never
---
Plan and apply must run the CLI and provider versions the lock file records.

## Avoid

```yaml
- task: TerraformInstaller@1
  inputs:
    terraformVersion: "latest"
- script: terraform init -upgrade -backend-config=key=$(terraformStateFileName)
```

## Use

```yaml
- task: TerraformInstaller@1
  inputs:
    terraformVersion: "1.16.4"
- script: terraform init -input=false -backend-config=key=$(terraformStateFileName)
```

- `terraformVersion` equals the root's `required_version` pin.
- Provider upgrades are a separate change that bumps the pins and commits `.terraform.lock.hcl`.

Details: skill://terraform/pipelines.md.
