# Terraform security & secrets
Tags → skill://terraform/sources.md.

## State exposure
- State and saved plans store every attribute in plaintext, `sensitive` ones included: restrict backend access and keep plan artifacts pipeline-scoped and short-lived. [HC:language/manage-sensitive-data, HC:cli/commands/apply]
- `sensitive = true` redacts CLI and UI output only; it never keeps a value out of state. [HC:language/block/output, HC:language/manage-sensitive-data]
- Keep secrets out of state where the floor allows: `ephemeral` resources and variables for run-time-only values (≥ 1.10); write-only `*_wo` arguments with their `*_wo_version` where the provider offers them (≥ 1.11). Below the floor: Key Vault data sources plus state access control. [HC:language/manage-sensitive-data, TFR:1.10, TFR:1.11]
- Provider-generated secrets (SP secrets, Astro API tokens, Key Vault values) persist in state: output them `sensitive` and never put them in handoff artifacts. [ASTRO:docs/resources/api_token, DAR:outputs.tf]

## Never in code
- No literal credentials in `.tf` or `.tfvars`: client secrets, passwords, tokens, access keys, SAS tokens, PATs, connection strings. [HC:language/style, GCP:version-control]
- Secret inputs: pipeline secret variables mapped to `TF_VAR_<name>` (house: PagerDuty keys) or Key Vault data sources; never `-var` on a logged command line. [ATP:.azure-pipelines/build.yml, DIAC:data.tf, GCP:root-modules]
- Tenant, subscription, and account IDs come from variables or tfvars, not literals in `provider` or `backend` blocks. [U, DAR:providers.tf]
- Tags carry no secrets or personal data. [CAF:resource-tagging]
- Every root's `.gitignore`: `**/.terraform/*`, `*.tfstate`, `*.tfstate.*`, `crash.log`, `override.tf`, `override.tf.json`, `*_override.tf`, `*_override.tf.json`, `*.tfplan`, `tfplan`, `terraform.tfvars`, `*.auto.tfvars`, `.terraformrc`, `terraform.rc`; `.terraform.lock.hcl` stays committed. [AAR:.gitignore, HC:language/style]

## Identity
- Pipelines authenticate with workload identity federation (OIDC), local runs with Azure CLI login; never client secrets or PATs. Setup: skill://terraform/pipelines.md §Auth. [AZRM:guides/service_principal_oidc, ADO:library/connect-to-azure, DBX:index]
- One least-privilege deploying identity per environment (house: `spn-data-admin-<env>`, `spn-dbx-tf-<env>`); lower environments never use prd identities. [AWS:security, GCP:security, AAR:.azure-pipelines/build.yml, DIAC:.github/index.md]
- People get access through groups; direct users only where the repo's guidance allows (data-admin-rbac break-glass `admins` and `direct_user_exceptions`; RBAC-published `entra_user` exceptions in Databricks-IaC). [DAR:.github/copilot-instructions.md, DIAC:.github/copilot-instructions.md]
