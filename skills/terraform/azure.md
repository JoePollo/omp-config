# Azure providers (azurerm, azuread, azapi)
Tags → skill://terraform/sources.md.

## azurerm
- `provider "azurerm" { features {} }` is mandatory; since 4.0 every instance needs `subscription_id` (from a variable) or `ARM_SUBSCRIPTION_ID`. [AZRM:index, AZRM:guides/4.0-upgrade-guide]
- House: a default instance plus a data-management-subscription alias (`data_management_subscription` or `data_management`), passed to modules explicitly. [AAR:providers.tf, DAR:providers.tf, ATP:providers.tf]
- Stay on the repo's major (house 4.x); 5.x (latest 5.7.0) is a requested migration only: read `guides/5.0-upgrade-guide` first (`resource_provider_registrations` defaults to `none`; `skip_provider_registration` removed). [AZRM:guides/5.0-upgrade-guide, REG:hashicorp/azurerm]
- Review `features` defaults before overriding them (Key Vault purge on destroy, VM OS-disk deletion, `resource_group.prevent_deletion_if_contains_resources`). [AZRM:guides/features-block]
- Never set `skip_import_check_on_create_and_allow_overwriting_existing_resources`: it overwrites existing resources silently. [AZRM:guides/features-block]
- `storage_use_azuread = true` for Blob and Queue data-plane calls; Files still uses Shared Key. [AZRM:index]
- Provider functions (`provider::azurerm::…`) need Terraform ≥ 1.8. [AZRM:guides/4.0-upgrade-guide]

## azuread
- Default provider configured from the environment; the deploying principal holds only the Microsoft Graph application roles each managed resource documents (`Directory.ReadWrite.All` only when required). [AZAD:guides/service_principal_configuration]
- Resolve existing groups and principals by `object_id`/`client_id` from tfvars, not display names. [DAR:.github/instructions/data-admin-rbac.instructions.md]

## azapi
- Only for resources or properties azurerm lacks (preview APIs); never manage one resource with both providers. [AZAPI, AZRM:guides/4.0-upgrade-guide]
- Validate Azure resource ID inputs with `can(provider::azapi::parse_resource_id("<type>", var.x))` (≥ 1.8). [AVM:TFNFR38]

## Naming & tags
- Names: CAF abbreviation, workload, `dev`/`tst`/`prd`, region, instance (house: `id-gfs-dnb-<env>-centralus-01`); check each type's length and character rules; names are usually immutable. [CAF:resource-naming, CAF:resource-abbreviations, DAR:README.md]
- Tags: at least the environment (CAF adds workload, owner, classification, cost center); changeable metadata goes in tags, not names; never secrets or personal data. [CAF:resource-tagging, ATP:modules/key-vault/main.tf]

## Role assignments & identities
- `azurerm_role_assignment` with `for_each` over a map keyed by caller-chosen names: `{ reader = { role_definition_name, scope, principal_id } }`; never keys built from apply-time IDs. [AVM:interfaces, DAR:modules/managed_identity/main.tf]
- `skip_service_principal_aad_check = true` only for service-principal assignments; `condition` only with `condition_version`. [AVM:interfaces]
- Identities owned by another root are read with data sources (house: astro-tf-platform reads the Astro identity through the data-management alias). [ATP:data.tf]
