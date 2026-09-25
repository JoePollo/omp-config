# Terraform KB sources
Verified 2026-09-25: web sources fetched and repo files read that day. Re-verify § Snapshot on Terraform CLI or provider upgrades.

| tag | source |
|---|---|
| `U` | user decision or house convention observed in the four repos, 2026-09-25 |
| `AAR:<path>` | `C:/Users/jpollock/src/astro-admin-rbac/<path>` |
| `ATP:<path>` | `C:/Users/jpollock/src/astro-tf-platform/<path>` |
| `DAR:<path>` | `C:/Users/jpollock/src/data-admin-rbac/<path>` |
| `DIAC:<path>` | `C:/Users/jpollock/src/Databricks-IaC/<path>` |
| `HC:<path>` | `https://developer.hashicorp.com/terraform/<path>` |
| `TFR:<x.y>` | `https://raw.githubusercontent.com/hashicorp/terraform/v<x.y>/CHANGELOG.md` |
| `HAS:<skill>` | `https://raw.githubusercontent.com/hashicorp/agent-skills/main/plugins/terraform/skills/<skill>/SKILL.md` |
| `GCP:<page>` | `https://cloud.google.com/docs/terraform/best-practices/<page>` |
| `AWS:<page>` | `https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/<page>.html` |
| `AVM:TFFR<n>` | `https://raw.githubusercontent.com/Azure/Azure-Verified-Modules/main/docs/content/specs-defs/includes/terraform/shared/functional/TFFR<n>.md` |
| `AVM:TFNFR<n>` | `https://raw.githubusercontent.com/Azure/Azure-Verified-Modules/main/docs/content/specs-defs/includes/terraform/shared/non-functional/TFNFR<n>.md` |
| `AVM:interfaces` | `https://azure.github.io/Azure-Verified-Modules/specs/tf/interfaces/` |
| `BAB:<page>` | `https://www.terraform-best-practices.com/<page>` |
| `GW` | `https://docs.gruntwork.io/guides/style/terraform-style-guide` |
| `TFLINT` | `https://raw.githubusercontent.com/terraform-linters/tflint-ruleset-terraform/main/docs/rules/README.md` |
| `AZRM:<path>` | `https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/<path>.html.markdown` |
| `AZAD:<path>` | `https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/main/docs/<path>.md` |
| `AZAPI` | `https://raw.githubusercontent.com/Azure/terraform-provider-azapi/main/docs/index.md` |
| `ADO:<path>` | `https://learn.microsoft.com/en-us/azure/devops/pipelines/<path>` |
| `APT:installer` | `https://raw.githubusercontent.com/microsoft/azure-pipelines-terraform/main/Tasks/TerraformInstaller/TerraformInstallerV1/README.md` |
| `APT:task` | `https://raw.githubusercontent.com/microsoft/azure-pipelines-terraform/main/Tasks/TerraformTask/TerraformTaskV4/README.md` |
| `MSTF:<page>` | `https://learn.microsoft.com/en-us/azure/developer/terraform/<page>` |
| `CAF:<page>` | `https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/<page>` |
| `DBX:<path>` | `https://raw.githubusercontent.com/databricks/terraform-provider-databricks/main/docs/<path>.md` |
| `ASTRO:<path>` | `https://raw.githubusercontent.com/astronomer/terraform-provider-astro/main/<path>.md` |
| `REG:<ns>/<name>` | `https://registry.terraform.io/v1/providers/<ns>/<name>` |

## Snapshot
- Terraform CLI 1.16.4 latest (2026-09-23), 1.17.0 in beta; local CLI 1.16.4 (`windows_386`); the 1.x compatibility promises cover the language and protected workflows.
- Registry latest (2026-09-10..24): azurerm 5.7.0, azuread 3.10.0, azapi 2.12.0, databricks 1.134.0, astro 1.5.3, random 3.9.1, time 0.14.2.
- House pins: Terraform `= 1.15.4`, `>= 1.5.0`, `>= 1.9.0`; azurerm `= 4.73.0`, `~> 4.0` (locked 4.77.0, 4.81.0), `~> 4.0.0` (locked 4.0.1); azuread `= 3.8.0`, `~> 3.8.0`; databricks `= 1.129.0`, `~> 1.0` (locked 1.118.0); astro `= 1.2.3`.
- Not installed locally: tflint, trivy, checkov, terraform-docs, tofu, terraform-ls.
- HashiCorp publishes agent skills (MPL-2.0; e.g. terraform-style-guide, refactor-module, terraform-test, terraform-search-import) and a Terraform MCP server for registry and provider-doc lookup; neither is installed here.

## Conflicts resolved
- Version constraints: HashiCorp and Google (root `~>`, module `>=` minimums) vs the user's choice: exact pins everywhere for new constraints; existing repo constraints unchanged (U).
- Environments: HashiCorp and Google recommend a directory per environment; the house runs one root with per-environment tfvars and state keys, so the house pattern wins (U); CLI workspaces are rejected by both.
- `count` vs `for_each`: HashiCorp allows `count` for near-identical instances and its agent skill prefers `for_each` everywhere; AVM and the house use `for_each` over stable keys for collections and `count` only for toggles, which this KB adopts.
- Variable typing: Babenko prefers simple types, Gruntwork and AVM concrete `object` types; concrete types win (house manifests use `map(object(...))`).
- Dynamic blocks: HashiCorp says sparingly, AVM uses them for optional nested blocks; both hold: only for optional or input-driven blocks.
- Databricks auth: provider docs prefer OAuth/federation while Microsoft Learn lists service-principal PATs; federation wins, no PATs.
- Backend auth: the Microsoft Learn state tutorial uses access keys, HashiCorp marks keys not recommended; Entra ID auth only.
- Provisioners: HashiCorp permits them after exhausting alternatives; this KB avoids them and uses `terraform_data` for lifecycle containers.
- AVM mandates AzAPI for new AVM modules; that policy is AVM-specific, so this KB keeps azurerm first.
