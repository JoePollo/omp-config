# Terraform in Azure DevOps
Tags → skill://terraform/sources.md. House repos: skill://terraform §Local platform.

## Shape
- Manual trigger; `environment` parameter limited to `dev`, `tst`, `prd`, deriving tfvars, service connection, and state key; stages Plan → approval → Apply of the saved plan. [AAR:.azure-pipelines/build.yml, HC:tutorials/automation/automate-terraform]
- data-admin-rbac and Databricks-IaC extend `databricks/terraform/apply.yml@templates` (ADO repo `data-platform-cicd-templates`, pinned `ref`): pass parameters, never inline Terraform steps; the template lives outside these repos. [DAR:.azure-pipelines/build.yml, DIAC:.azure-pipelines/build.yml]
- Every job installs the exact CLI: `TerraformInstaller@1` with `terraformVersion: "X.Y.Z"` equal to `required_version`; never `latest`. [APT:installer, U]
- Non-interactive: `TF_IN_AUTOMATION=1` and `-input=false` on `init`, `plan`, and `apply`. [HC:tutorials/automation/automate-terraform]
- `terraform init -input=false -backend-config=key=$(terraformStateFileName)`; never `-upgrade`: it re-selects providers within the constraints and breaks plan/apply parity. [HC:language/files/dependency-lock, HC:tutorials/automation/automate-terraform]
- Plan: `terraform plan -input=false -out=$(Build.ArtifactStagingDirectory)/tfplan -var-file=<env tfvars>`, then `PublishPipelineArtifact@1` as `terraform-plan-<env>`. [AAR:.azure-pipelines/build.yml, APT:task]
- Approval: an ADO environment approval check, or the house agentless `ManualValidation@1` job with `onTimeout: reject`. [ADO:process/approvals, AAR:.azure-pipelines/build.yml]
- Apply: `DownloadPipelineArtifact@2`, same CLI, `init` without `-upgrade`, then `terraform apply -input=false "$(Pipeline.Workspace)/tfplan/tfplan"`; no `-auto-approve`, no fresh plan. [APT:task, HC:cli/commands/apply]
- Refresh-only and destroy runs take the same path: `plan -refresh-only -out=…` or `plan -destroy -out=…`, reviewed, then apply that file. [HC:cli/commands/plan]
- Never break a state lease or `force-unlock` in a pipeline: a held lease fails the run with its details. [HC:language/state/locking]
- Plan artifacts contain secrets: pipeline-scoped only, never attached to PRs, wikis, or logs. [APT:task, HC:language/manage-sensitive-data]
- Plan and apply run on the same OS, architecture, CLI, and provider versions. [HC:tutorials/automation/automate-terraform]

## Auth
- Workload identity federation service connections, one per environment, authorized per pipeline. [ADO:library/connect-to-azure, AZRM:guides/service_principal_oidc]
- Terraform steps run inside `AzureCLI@2` (`azureSubscription: <service connection>`) with `ARM_TENANT_ID`, `ARM_CLIENT_ID`, `ARM_SUBSCRIPTION_ID`, and this `env` block: [AZRM:guides/service_principal_oidc]

```yaml
env:
  ARM_USE_OIDC: true
  SYSTEM_ACCESSTOKEN: $(System.AccessToken)
  SYSTEM_OIDCREQUESTURI: $(System.OidcRequestUri)
  ARM_ADO_PIPELINE_SERVICE_CONNECTION_ID: $(SERVICE_CONNECTION_ID)
```

- Backend: `use_oidc = true`, `use_azuread_auth = true`. [HC:language/backend/azurerm]
- Never export `ARM_CLIENT_SECRET` from `addSpnToEnvironment` (the astro pipelines still do; retrofit only when asked). [AZRM:guides/service_principal_oidc, AAR:.azure-pipelines/build.yml]
- `TerraformTaskV4@4` needs the Microsoft DevLabs extension; house pipelines script Terraform inside `AzureCLI@2`. [AZRM:guides/service_principal_oidc, AAR:.azure-pipelines/build.yml]

## Promotion
- The same commit moves dev → tst → prd, each with its own plan and approval; prd plans are reviewed in full. [HC:cloud-docs/recommended-practices/part3.3, DIAC:.github/index.md, DAR:README.md]
- Cross-repo order: apply data-admin-rbac and publish `principal_registry` before planning Databricks-IaC. [DIAC:.github/index.md]
- Preview environments (astro-tf-platform `preview-<branch>-astro.tfstate`) still plan, review, and apply the saved plan; teardown is a reviewed `plan -destroy`. [ATP:.azure-pipelines/feature-preview-deploy.yaml, HC:tutorials/automation/automate-terraform]
