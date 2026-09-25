# Astronomer (astro provider)
Tags → skill://terraform/sources.md.
- `astronomer/astro` needs Terraform ≥ 1.7; house pin `= 1.2.3` in astro-tf-platform (latest 1.5.3; upgrade only when asked). [ASTRO:README, ATP:versions.tf, REG:astronomer/astro]
- Auth: `ASTRO_API_TOKEN` from a pipeline secret variable (house: `$(ASTRO_ORG_API_KEY)`), never a `token` argument; `organization_id` from a variable. [ASTRO:docs/index, ATP:.azure-pipelines/build.yml]
- Organization, workspace, and cluster IDs are per-environment variables, not literals inside modules. [U, ATP:modules/deployments/main.tf]
- `astro_deployment`: changing `type`, `workspace_id`, `cluster_id`, or `region` recreates it; call out the replacement. [ASTRO:docs/resources/deployment]
- Astro Runtime upgrades ship through the project image and `astro deploy`; the Terraform attribute is immutable after creation. [ASTRO:docs/resources/deployment]
- `environment_variables` is the complete set: omitted entries are deleted on apply, and secret values must be supplied again, also after import. [ASTRO:docs/resources/deployment]
- Team and user roles on deployments or DAGs also need the parent workspace role. [ASTRO:docs/resources/team_roles, ASTRO:docs/resources/user_roles]
- `astro_api_token` values land in state in plaintext: prefer tokens created outside Terraform; if managed here, output them `sensitive` and restrict state access. [ASTRO:docs/resources/api_token]
- House split: the Azure side (resource group, user-assigned identity, role assignments) lives in astro-admin-rbac; deployments, alerts, and notification channels live in astro-tf-platform, whose pipeline also creates federated credentials for Astro workloads. [AAR:modules/astro/main.tf, ATP:main.tf, ATP:.azure-pipelines/build.yml]
