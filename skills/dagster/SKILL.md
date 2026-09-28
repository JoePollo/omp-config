---
name: dagster
description: Dagster 1.13 knowledge base (dg projects and components, assets, resources and environments, automation and partitions, testing and asset checks, Dagster+ Hybrid and OSS deployment on AKS, Databricks orchestration). Routed by rule://domain-router.
hide: true
kb:
  files: ['**/dg.toml', '**/dagster.yaml', '**/dagster_cloud.yaml']
  content:
    - { files: '**/*.py', pattern: '^\s*(?:from|import)\s+dagster(?:_[a-z0-9_]+)?\b' }
    - { files: '**/pyproject.toml', pattern: '^\[tool\.dg(?:\.[a-z_]+)?\]' }
    - { files: '**/*.{yml,yaml}', pattern: '\bdagster\b', flags: i }
  commands: ['^(?:uv\s+run\s+)?dg\b', '^(?:uvx\s+)?create-dagster\b', '^dagster(?:-webserver|-daemon|-cloud)?\b']
  mcp: ['mcp__dagster_']
  topics:
    - file: project.md
      files: ['**/dg.toml', '**/dagster.yaml', '**/dagster_cloud.yaml']
      content:
        - { files: '**/pyproject.toml', pattern: '^\[tool\.dg(?:\.[a-z_]+)?\]' }
        - { files: '**/definitions.py', pattern: '@dg\.definitions\b|\bdg\.Definitions\s*\(|dg\.load_from_defs_folder' }
      commands: ['^(?:uv\s+run\s+)?dg\b', '^(?:uvx\s+)?create-dagster\b']
    - file: assets.md
      content: [{ files: '**/*.py', pattern: '@dg\.(?:asset|multi_asset|graph_asset|graph_multi_asset)\b|\b(?:AssetKey|AssetSpec|AssetDep|MaterializeResult|AssetObservation|AssetCheckResult)\b' }]
    - file: resources.md
      content: [{ files: '**/*.py', pattern: '\b(?:ConfigurableResource|dg\.EnvVar|dg\.Config|ResourceParam|ResourceDependency)\b' }]
    - file: automation.md
      content: [{ files: '**/*.py', pattern: '\b(?:AutomationCondition|PartitionsDefinition|DynamicPartitionsDefinition|BackfillPolicy|RunRequest|ScheduleDefinition|SensorDefinition)\b|@dg\.(?:schedule|sensor)\b' }]
    - file: testing.md
      files: ['**/tests/**/*.py', '**/test_*.py', '**/*_test.py']
      content: [{ files: '**/*.py', pattern: '\b(?:dg\.materialize|dg\.check|AssetCheckResult|FreshnessPolicy|validate_loadable)\b' }]
    - file: deploy.md
      files: ['**/build.yaml', '**/container_context.yaml', '**/dagster.yaml', '**/dagster_cloud.yaml']
      content: [{ files: '**/*.{yml,yaml}', pattern: '\b(?:dagster|DAGSTER_CLOUD|dagsterCloud)\b', flags: i }]
      commands: ['^(?:uv\s+run\s+)?dg\s+plus\s+(?:deploy|create|pull)\b', '^helm\s+(?:install|upgrade)\b']
    - file: databricks.md
      content:
        - { files: '**/*.py', pattern: '\b(?:dagster_databricks|DatabricksClient|WorkspaceClient|run_now_and_wait|pipelines\.start_update)\b' }
        - { files: '**/*.{yml,yaml}', pattern: '\b(?:DatabricksWorkspaceComponent|DatabricksAssetBundleComponent)\b' }
---

# Dagster KB

Defaults only: explicit instructions, AGENTS.md, repo config/conventions win; skill://databricks-platform owns Databricks-side design and skill://python owns general Python style; skill://dagster-expert (vendored upstream skill) supplies exact API, CLI, and YAML syntax, and this KB wins where they differ. Read every topic whose trigger matches. Tags → skill://dagster/sources.md.

## Topics

| trigger | read |
|---|---|
| `create-dagster`, project layout, `definitions.py`, `defs/`, `@dg.definitions`, `pyproject.toml` `[tool.dg]`, `dg.toml`, `workspace.yaml`, code locations, shared code, components, `defs.yaml`, state-backed components, `dg` commands | skill://dagster/project.md |
| `@dg.asset`, `@dg.multi_asset`, asset keys, groups, owners, kinds, tags, metadata, `deps`, I/O managers, `MaterializeResult`, external or virtual assets, observations, asset jobs, ops, dynamic fanout | skill://dagster/assets.md |
| `ConfigurableResource`, `dg.EnvVar`, secrets, `.env`, `dg.Config` run config, dev/tst/prd selection, Azure Storage, SQL Server, Microsoft Teams | skill://dagster/resources.md |
| schedules, sensors, `AutomationCondition`, declarative automation, partitions, partition mappings, backfills, concurrency pools, run queue limits, retries, timeouts, run monitoring | skill://dagster/automation.md |
| `tests/`, unit tests, `materialize`, `dg check`, asset checks, freshness policies, logging, compute logs, PII, alerts | skill://dagster/testing.md |
| Dagster+ Hybrid or Serverless, branch or full deployments, AKS agent, `build.yaml`, `container_context.yaml`, `dagster_cloud.yaml`, OSS Helm charts, `dagster.yaml`, run launchers, Postgres storage, images, CI/CD, Dagster upgrades | skill://dagster/deploy.md |
| Databricks jobs, pipelines, SQL, bundle, Pipes, Databricks Connect, Databricks components, `dagster-databricks`, Databricks SDK | skill://dagster/databricks.md |
| exact API signatures, `dg` flags and `--json` output, component YAML schemas, automation condition operands and operators, asset selection syntax, integration library catalog | skill://dagster-expert (its SKILL.md Reference Index, then the matching `references/` file) |

## Core

- Target Dagster 1.13: `dagster`, `dagster-dg-cli`, `create-dagster`, `dagster-webserver`, `dagster-cloud` 1.13.x with integration libraries 0.29.x on Python 3.10–3.14; a project's `pyproject.toml` and `uv.lock` pins win. [PYPI:dagster, DG:about/releases, DG:about/changelog]
- API, CLI, or YAML syntax this KB doesn't show: read the matching skill://dagster-expert reference first; never guess. [SK:SKILL.md]
- Durable data (tables, files, models) are assets named for their output; ops and op jobs only for work that produces no persistent asset. [DG:guides/build/assets/defining-assets, DG:api/dagster/assets, SK:references/assets/INDEX.md]
- New projects: `uvx create-dagster@latest project <path>`; definitions under `src/<package>/defs/`, loaded by `@dg.definitions` with `dg.load_from_defs_folder`; add them with `dg scaffold defs`, then `uv run dg check defs` and `uv run dg list defs`. [DG:guides/build/projects/creating-projects, DG:api/dagster/definitions, SK:references/cli/scaffold/defs.md]
- Definitions load without I/O: no API, database, HTTP, or Spark calls at module level or while building definitions; external metadata comes from state-backed components refreshed in CI. [DG:api/dagster/definitions, DG:guides/build/components/state-backed-components]
- External systems are reached only through `dg.ConfigurableResource`s; secrets arrive via `dg.EnvVar`, never literals or load-time `os.getenv`. [DG:guides/build/external-resources/defining-resources, DG:guides/operate/configuration/using-environment-variables-and-secrets]
- One codebase for dev/tst/prd: environment names, hosts, and IDs come from the deployment's environment variables; no environment literals in code or YAML. [U, DG:examples/full-pipelines/dagster-plus-deployment/define-assets]
- Automation: declarative automation for dependency-aware refresh, schedules for fixed-time jobs, sensors for external events and side effects; the automation condition sensor starts stopped. [DG:guides/automate, DG:guides/automate/declarative-automation/automation-condition-sensors]
- Writes are idempotent per partition or run: overwrite or MERGE the target slice, never blind appends; retries and backfills replay them. [DG:guides/build/partitions-and-backfills/backfilling-data, DG:examples/best-practices/partition-backfill-strategies]
- Dagster orchestrates, Databricks computes: the `data_platform` bundle owns Databricks jobs, pipelines, and compute; Dagster triggers deployed jobs. [U, DG:integrations/libraries/databricks]
- Preview APIs can break in patch releases and beta APIs in minors: preview stays out of production code without explicit approval. [DG:about/releases, DG:api/api-lifecycle]
- Deployed Dagster (Dagster+ or OSS), Databricks, Azure, and SQL Server are read-only for agents: no materializations, launches, re-executions, backfills, deploys, or secret, state, or setting changes without explicit permission (§Diagnose). [U]
- Python style: skill://python; tests with `uv run pytest`. [U]

## Diagnose (read-only)

| question | command |
|---|---|
| definitions load; YAML and TOML valid | `uv run dg check defs [--verbose]`; `uv run dg check yaml`; `uv run dg check toml` |
| what is defined | `uv run dg list defs --json [--assets <selection>] [--columns <names>]` (`key`, `group`, `deps`, `kinds`, `tags`, `cron`); `uv run dg list components --json`; `uv run dg list envs` |
| component schema | `uv run dg utils inspect-component <ComponentType> --defs-yaml-schema` |
| deployed runs, assets, schedules, sensors (Dagster+) | read-only `dg api` `list`/`get`/`get-*` subcommands per skill://dagster-expert/references/cli/api/INDEX.md; never print secret values |
| deployed runs (OSS) | Dagster UI run, asset, and automation pages, view only |

Never without explicit permission: `dg launch`, runs or backfills started from `dg dev` or the UI, `dg api run launch` and rerun or terminate, `dg api` alert-policy, artifact, code-location, deployment, or organization writes, Dagster+ MCP write tools, `dg plus deploy`, `dg plus create env`, `dg plus pull env`, `dg utils refresh-defs-state`, `dg plus deploy refresh-defs-state`, `helm install`/`helm upgrade`. [U, SK:references/cli/launch.md, SK:references/cli/api/INDEX.md, SK:references/cli/plus/INDEX.md, SK:references/cli/utils/refresh-defs-state.md]
