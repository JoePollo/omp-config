# Dagster dbt integration

Tags → skill://dbt/sources.md.

## Component boundary

- Use `dagster_dbt.DbtProjectComponent` as the house-standard integration when available; never use `@dbt_assets` when the component exists. [DGCOMPONENT, U]
- Keep the dbt project outside the Dagster Python package and point the component at its project path or repository source. [DGPROJECT, DGSCaffold]
- Let the component compile and cache the dbt manifest and expose dbt resources as Dagster assets; configure model selection and CLI arguments through the component. [DGCOMPONENT]
- Keep model SQL, dbt dependencies, tests, and materializations in the dbt project; use Dagster as the orchestrator for dbt assets. [DGCOMPONENT, DGPROJECT, U]
- Read `skill://dagster-expert/references/integrations/dagster-dbt/component-based-integration.md` for component YAML and customization; do not duplicate its detailed API here. [DGCOMPONENT]
- Keep hosted dbt product integrations outside this open-source dbt pack. [LIC, U]
