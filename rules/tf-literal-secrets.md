---
description: "No literal credentials in Terraform code or tfvars"
condition:
  - '(?i)\b(?:\w+_)?(?:secret|password|passwd|access_key|account_key|private_key|api_key|integration_key|sas_token|token|connection_string)[ \t]*=[ \t]*"[^"$%\s][^"]*"'
scope: "tool:edit(*.{tf,tfvars}), tool:write(*.{tf,tfvars})"
interruptMode: never
---
Credentials never live in `.tf` or `.tfvars`: state, plans, and git history keep them in plaintext.

## Avoid

```hcl
client_secret = "s3cr3t-value"
```

## Use

```hcl
variable "pagerduty_integration_key" {
  description = "PagerDuty integration key, supplied by the pipeline as TF_VAR_pagerduty_integration_key."
  type        = string
  sensitive   = true
}
```

- Pipelines map secret variables to `TF_VAR_<name>`; providers and backends authenticate with OIDC or managed identity, never keys, SAS tokens, PATs, or client secrets.
- Values Terraform must pass on: Key Vault data sources; Terraform ≥ 1.10 `ephemeral` and ≥ 1.11 write-only `*_wo` arguments keep them out of state.

Details: skill://terraform/security.md.
