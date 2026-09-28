# Projects, definitions, and the dg CLI

Tags → skill://dagster/sources.md.

## Scaffold and layout

- New projects: `uvx create-dagster@latest project <path>` (uv project; accept `uv sync`); Python 3.10+; the `dagster project scaffold` command group was removed in 1.12.6. [DG:guides/build/projects/creating-projects, DG:about/changelog]
- Layout: deployable code in `src/<package>/`, entrypoint `src/<package>/definitions.py`, definitions in `src/<package>/defs/` (Python modules and component folders holding `defs.yaml`), tests in `tests/`. [DG:guides/build/projects/project-structure/project-overview, DG:api/clis/create-dagster]
- `pyproject.toml`: `[tool.dg]` `directory_type = "project"`, `[tool.dg.project]` `root_module = "<package>"`; defaults `defs_module = "<package>.defs"`, `code_location_target_module = "<package>.definitions"`; optional `code_location_name`, `registry_modules`. [DG:api/clis/dg-cli/dg-cli-configuration]
- Organize `defs/` by technology or concept as it grows; external projects (dbt and similar) live outside the Dagster package. [DG:guides/build/projects/project-structure/organizing-dagster-projects]
- Dependencies: `uv add dagster-<integration>`; `dagster-dg-cli` as a dev dependency; `dagster-cloud` in the runtime environment on Dagster+. [SK:references/integrations/INDEX.md, DG:deployment/dagster-plus/deploying-code/configuring-ci-cd]

## Definitions

- Entrypoint: a zero-argument `@dg.definitions` function returning `dg.Definitions`; `dg.load_from_defs_folder(...)` (as scaffolded) discovers `defs/`; `dg.Definitions.merge(...)` adds Python-defined objects. [DG:api/dagster/definitions, DG:guides/build/projects/project-structure/combining-components-with-pythonic-definitions]
- `defs/` modules declare assets, checks, schedules, sensors, and jobs from static values; `@dg.definitions` keeps construction out of import time. [DG:api/dagster/definitions]
- Resources are not components: bind them in Python (`dg.Definitions(resources={...})` from a `@dg.definitions` function), never as `defs/<name>/defs.yaml`. [DG:guides/build/projects/project-structure/combining-components-with-pythonic-definitions]
- Existing projects keep their loading style (`Definitions(...)` modules, `load_assets_from_modules`, `@repository`; none is deprecated in the 1.10–1.13 notes); move to `defs/` autoloading only when asked. [DG:about/changelog, GH:MIGRATION.md, U]
- Asset keys are unique per deployment: two definitions of one key fail to load (error since 1.11.0). [DG:about/changelog]

## Components

- Order of preference: an integration's component, a subclass of it, a custom `dg.Component`, a `StateBackedComponent`; `uv run dg list components --json` is the catalog. [SK:references/integrations/INDEX.md]
- An instance is `defs/<name>/defs.yaml` with `type:` and `attributes:`; scaffold with `dg scaffold defs <ComponentType> <name>`; read the schema first with `dg utils inspect-component <ComponentType> --defs-yaml-schema`. [DG:dagster-basics-tutorial/custom-components, SK:references/cli/scaffold/defs.md, SK:references/integrations/INDEX.md]
- Custom components subclass `dg.Component`, `dg.Resolvable`, and `dg.Model` and implement `build_defs()`. [DG:api/dagster/components]
- Environment values in YAML: `{{ env.NAME }}`, declared under `requirements.env` in `defs.yaml`; `dg check yaml --validate-requirements` checks them. [DG:guides/build/components/using-environment-variables-in-components, DG:integrations/libraries/databricks/databricks-asset-bundle-component]
- State-backed components cache external metadata: `LOCAL_FILESYSTEM` (default since 1.13.0; `.local_defs_state/`, shipped inside the image) or `VERSIONED_STATE_STORAGE` (OSS: `defs_state_storage` in `dagster.yaml`); never `LEGACY_CODE_SERVER_SNAPSHOTS` for new work. [DG:guides/build/components/state-backed-components, SK:references/components/state-backed/using.md]
- CI refreshes state once per project with `uv run dg utils refresh-defs-state` before the image build; local `dg` commands refresh automatically unless `refresh_if_dev: false`. [DG:guides/build/components/state-backed-components/managing-state-in-ci-cd, DG:guides/build/components/state-backed-components]

## Code locations and workspaces

- Start with one code location; split by team, tool, or critical pipeline when release cadence, dependencies, or isolation needs differ. [BLOG:code-location-best-practices]
- Each code location is its own process and Python environment; assets in different locations never share a run: link them with `deps` or asset keys and trigger downstream work with declarative automation or sensors. [DG:guides/build/projects/workspaces/creating-workspaces, DG:guides/build/assets/defining-assets-with-asset-dependencies]
- Shared code: a local path dependency inside one repository; a versioned private package across repositories, pinned per location. [DG:examples/best-practices/shared-module, BLOG:code-location-best-practices]
- Multi-project OSS workspaces: root `dg.toml` with `directory_type = "workspace"` and `[[workspace.projects]]` `path` entries; `workspace.yaml` only where it already exists. [DG:guides/build/projects/workspaces/dg-toml, DG:guides/build/projects/workspaces/workspace-yaml]

## dg workflow

- Author: `uv run dg scaffold defs dagster.asset <path>.py` (or a component type) → edit → `uv run dg check defs` (exit 1 on errors) → `uv run dg list defs` confirms registration. [SK:references/cli/scaffold/defs.md, DG:api/clis/dg-cli/dg-cli-reference, SK:references/cli/list-defs.md]
- Config files: `dg check yaml [<paths>] [--validate-requirements]`, `dg check toml`. [DG:api/clis/dg-cli/dg-cli-reference]
- Run `dg` through `uv run` in the project environment; prefer `--json` when parsing output. [SK:SKILL.md]
- `dg dev` serves a local UI (`--port`, `-w <workspace>`); `dg launch --assets <selection>` materializes in-process through the configured resources, so it needs explicit permission and non-production resources. [DG:api/clis/dg-cli/dg-cli-reference, SK:references/cli/launch.md, U]
