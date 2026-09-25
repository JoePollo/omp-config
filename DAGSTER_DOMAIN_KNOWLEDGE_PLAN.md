# Dagster domain knowledge (house skill pack + vendored dagster-expert + router row + TTSR)

## Context
Add Dagster as a domain of the omp JIT domain-knowledge router in `C:/Users/jpollock/.omp/agent/` (live domains: python, coding-entropy, databricks-platform, databricks-silver-modeling, terraform, airflow). Deliverables: (1) hidden house skill pack `skill://dagster` in the sibling-pack format (core rules + topic index + topic files + `sources.md` tag legend); (2) a pinned, hidden vendored copy of Dagster's official Apache-2.0 `dagster-expert` skill as `skill://dagster-expert`, the second-hop reference for deep API/CLI detail; (3) one router row; (4) five `dg-` TTSR reminders using the sibling rules' interrupt mode. Knowledge targets Dagster 1.13 (latest `dagster` 1.13.24, 2026-09-21), grounded in docs.dagster.io, the `dagster-expert` skill, Dagster blog best-practice posts, and the Databricks SDK docs.

Decisions (user, this session): house pack + vendored official skill (explicit approval of the vendored third-party content, which AGENTS.md otherwise treats as a new dependency); deployment topic covers both Dagster+ Hybrid on AKS and OSS on AKS via Helm (undecided); Dagster only — no Airflow coexistence/migration (Airlift) content.

## Findings (verified this session)

### JIT framework as implemented
- Router `C:/Users/jpollock/.omp/agent/rules/domain-router.md` (13 lines): frontmatter `alwaysApply: true`; header `Domain KB: before first edit/review/plan touching a trigger → read skill://<domain>, then topics its index selects. Once per context; re-read after compaction. Repo config > AGENTS.md > KB.`; table `| domain | triggers | read |`; rows in order python, coding-entropy, databricks-platform, databricks-silver-modeling, terraform, airflow (last line).
- Pack shape (`skills/airflow/SKILL.md`, `skills/databricks-platform/SKILL.md`): frontmatter `name`, `description` ending `Routed by rule://domain-router.`, `hide: true`; `# <Name> KB`; precedence line; `## Topics` table `| trigger | read |`; `## Core` bullets ending `[TAG, …]`; optional `## Diagnose (read-only)` and `## Local platform (observed …; repo config wins)`. Topic files: `# <Title>`, `Tags → skill://<domain>/sources.md.`, `##` sections of tagged bullets. `sources.md`: `# <Name> KB sources`, verification line, `| tag | source |` legend, `## Snapshot`, `## Conflicts resolved`.
- TTSR rule shape (`rules/af-top-level-code.md`, `rules/af-env-literals.md`, `rules/af-databricks-bundle-owned.md`): frontmatter `description`, `condition` (list of single-quoted regexes; `''` is one `'`; a leading `(?i)`/`(?m)` becomes a regex flag), `scope: "tool:edit(<glob>), tool:write(<glob>)"` (brace and `**/` globs work; `*.py` is used by `af-sdk-imports`), `interruptMode: never`; body = rationale line, `## Avoid`/`## Use` code blocks or an avoid→use table, `Details: skill://…`, `Exception: …`. Existing prefixes: `py-`, `af-`, `tf-`, `dbp-`, `dbx-silver-`; no `dg-` files.
- `agents/code-review.md` reads `rule://domain-router` rows (no hardcoded domain list, L51/L64), so a router row reaches reviews; the quality gate groups files by extension (python/yaml/markdown cover Dagster files).
- omp skills (omp://skills.md): discovered one level under `skills/` (`<skills-root>/<name>/SKILL.md`); `hide: true` removes a skill from the prompt listing but `skill://<name>` and `skill://<name>/<relative/nested path>` still resolve; first same-named skill wins.
- Verification pattern used by the airflow pack: `omp ttsr list`; `omp ttsr test --rule <file> --source tool --tool edit|write --path <p> '<snippet>'`; `omp ttsr scan <dir>`; `omp read skill://<name>[/<file>]`; headless `omp -p --no-session [--mode json] "<prompt>"`. Files live outside git; the plan-end quality gate reporting "Not a git repository" is expected.
- No repository under `C:/Users/jpollock/src` references `dagster`.
- Pending sibling plan `C:/Users/jpollock/.omp/agent/sessions/-.omp-agent/2026-09-25T20-32-37-673Z_01a0da45-1d29-7774-81a0-6b3a1f91505e/local/harness-determinism-plan.md` would replace the router table with `extensions/domain-router.ts` + `extensions/lib/domains.ts` (`DomainName` union; per-domain `paths`, `astroPaths`, content regexes with `contentPaths`, `commands`, `mcp`), rewrite `rules/domain-router.md` to a semantic-trigger table, add `autoloadSkills` to `agents/code-review.md`, and flip edit/write rules to `interruptMode: tool-only`. Today `extensions/` holds only `quality-gate.ts` (Step 1 handles both states).
- Shell (bash tool, Windows 11): `curl.exe`, `tar.exe` (bsdtar), `find`, `cp`, `mkdir`, `rm`, `wc`, `diff`, `bun`, `omp` available. AGENTS.md reserves git operations for the user → vendoring uses a tarball download, not `git clone`.

### Dagster sources and versions
- PyPI (2026-09-21): `dagster`, `dagster-dg-cli`, `create-dagster`, `dagster-webserver`, `dagster-cloud`, `dagster-pipes` 1.13.24; `dagster-postgres`, `dagster-k8s`, `dagster-databricks`, `dagster-azure`, `dagster-msteams` 0.29.24; `requires-python >=3.10,<3.15`; releases about weekly (1.13.0 on 2026-04-09).
- Prefect is acquiring Dagster Labs (announced 2026-07-13); Dagster keeps its name and OSS license; Dagster+ stays supported.
- Research reports (scouts, this session) covered docs.dagster.io authoring, projects/components/`dg` CLI, resources/env, automation/partitions/concurrency, testing/checks/logging, deployment (OSS + Dagster+ Hybrid on AKS), Databricks/Azure/SQL Server/Teams integrations, changelog 1.10→1.13.24 + `MIGRATION.md`, and the vendored skill. Spot-checked directly: kinds ≤10 and `compute_kind` superseded; nested groups need 1.13.9+; `dg list envs` (CLI reference) is the command name; `DatabricksClient.workspace_client`; Databricks SDK `jobs.list(name=…)` exact case-insensitive filter, `jobs.run_now_and_wait(job_id, job_parameters, timeout)` and 20-minute default waiters, `pipelines.start_update`/`get_update`; SDK unified auth (env vars, Azure MSI, OAuth M2M).
- Key doc facts driving rules: `dg.EnvVar` resolves at run launch and is hidden in the UI while load-time `os.getenv` values show in the UI; removed in 1.13.0: `external_asset_from_spec(s)`, single-`AssetKey` `deps`, `Definitions.get_all_asset_specs`; deprecated since 1.8: `AutoMaterializePolicy`/`AutoMaterializeRule`/`auto_materialize_policy=`, `SourceAsset`; `LegacyFreshnessPolicy` + `build_*_freshness_checks` superseded by top-level `FreshnessPolicy` (1.12); `@repository`, `load_assets_from_modules`, `with_resources`, function-style `@resource` carry no deprecation; Databricks components are preview; Dagster's documented existing-job trigger is `WorkspaceClient.jobs.run_now(job_id=…).result()`.

### Vendored skill
- `dagster-io/skills`, branch `release-stable`, commit `97d54a45e5f55ca738de4e90937857c1b93168f5` ("1.13.24", 2026-09-21); skill dir `plugins/dagster/skills/dagster-expert/` has 173 files (tree API); repo root has `LICENSE` (Apache-2.0), no `NOTICE`.
- `SKILL.md` frontmatter: line 1 `---`, line 2 `name: dagster-expert`, then a multi-line `description:`; body links references as `./references/…`; it recommends `dg launch`, `dg api` mutations, `dg plus deploy`, `dg utils refresh-defs-state`, and the Dagster+ MCP, and one reference shows `pip install -e .` — the house pack overrides all of these.

## Approach
Order: Step 0, then Step 2 (vendoring, commands), then Steps 1, 3, 4 (independent file writes). Write every file UTF-8, LF line endings, trailing newline, byte-exact from this plan: content = the lines between an opening four-backtick `markdown` fence and its closing four-backtick fence, both exclusive; inner three-backtick blocks are file content. Agent dir `C:/Users/jpollock/.omp/agent/`; house skill dir `skills/dagster/`; vendored dir `skills/dagster-expert/`; TTSR prefix `dg-`.

### 0. Preflight (read-only)
1. If `skills/dagster/SKILL.md` exists and its `description` does not start with `Dagster 1.13 knowledge base`, stop and report the conflict. Otherwise continue (re-runs overwrite this pack).
2. If `skills/dagster-expert/SKILL.md` exists and its line 2 is not `name: dagster-expert`, stop and report. Otherwise continue (Step 2 replaces the directory).
3. Glob `rules/dg-*.md`; if any file exists whose name is not one of the five in Step 4, save the five files as `dagster-<rest>.md` (e.g. `dagster-legacy-apis.md`) and use those names everywhere in Verification.
4. Router mode: `extensions/lib/domains.ts` exists → Step 1B (plus 1A if `rules/domain-router.md` still contains the line `| domain | triggers | read |`); absent → Step 1A only.
5. Read the `interruptMode:` value in `rules/af-sdk-imports.md` (today `never`); every Step 4 rule uses that value in place of `never`.

### 1A. Router row (router table present)
Re-read `rules/domain-router.md` immediately before writing (sibling sessions edit it). Replace the row whose first cell is `dagster`; else append this row after the last table row. Touch nothing else:
````markdown
| dagster | dg.toml dagster.yaml dagster_cloud.yaml; Dagster projects (definitions.py, defs/ folders, component defs.yaml, [tool.dg] in pyproject.toml, dagster or dagster_* imports), Dagster assets, asset checks, resources, IO managers, schedules, sensors, declarative automation, partitions, backfills, jobs, Pipes, components, dg or create-dagster CLI, Dagster+ (Hybrid build.yaml/container_context.yaml, branch deployments), Dagster OSS Helm charts, webserver, daemon, Databricks jobs orchestrated from Dagster | skill://dagster |
````

### 1B. Router extension present (only if `extensions/lib/domains.ts` exists)
1. `extensions/lib/domains.ts`: append `| "dagster"` to the `DomainName` union; add a `dagster` domain entry after the last domain entry, copying the object shape of the existing `terraform` entry, with: paths `**/dg.toml`, `**/dagster.yaml`, `**/dagster_cloud.yaml`; content regexes `/^\s*(?:from|import)\s+dagster(?:_[a-z0-9_]+)?\b/m` for `**/*.py`, `/^\[tool\.dg(?:\.[a-z_]+)?\]/m` for `**/pyproject.toml`, `/\bdagster\b/i` for `**/*.yml` and `**/*.yaml`; commands `/^(?:uv\s+run\s+)?dg\b/`, `/^(?:uvx\s+)?create-dagster\b/`, `/^dagster(?:-webserver|-daemon|-cloud)?\b/`; no astroPaths, no mcp, no topic entries.
2. `rules/domain-router.md`: append after the last row of the semantic-trigger table: `| dagster | Dagster projects, assets, resources, automation, partitions, asset checks, components, dg CLI, Dagster+ or OSS deployment, Databricks jobs orchestrated from Dagster |`.
3. If `agents/code-review.md` frontmatter has `autoloadSkills`, append `dagster` to that list and insert `dagster, ` immediately before `and terraform` in its sentence `The indexes for … are preloaded.`
4. Check: `bun build C:/Users/jpollock/.omp/agent/extensions/domain-router.ts --target bun --outfile C:/Users/jpollock/AppData/Local/Temp/dg-router-check.js` exits 0.

### 2. Vendor skill://dagster-expert (main agent, commands)
No equivalent skill exists (`skills/` holds airflow, coding-entropy, databricks-platform, databricks-silver-modeling, python, terraform).
1. Download and extract (bash tool):
   - `mkdir -p C:/Users/jpollock/AppData/Local/Temp/dagster-skills-vendor`
   - `curl -fsSL -o C:/Users/jpollock/AppData/Local/Temp/dagster-skills-vendor/skills.tar.gz https://codeload.github.com/dagster-io/skills/tar.gz/97d54a45e5f55ca738de4e90937857c1b93168f5`
   - `tar -xzf C:/Users/jpollock/AppData/Local/Temp/dagster-skills-vendor/skills.tar.gz -C C:/Users/jpollock/AppData/Local/Temp/dagster-skills-vendor`
   - The upstream root is `C:/Users/jpollock/AppData/Local/Temp/dagster-skills-vendor/skills-97d54a45e5f55ca738de4e90937857c1b93168f5` (the tarball's top directory).
2. `find C:/Users/jpollock/AppData/Local/Temp/dagster-skills-vendor/skills-97d54a45e5f55ca738de4e90937857c1b93168f5/plugins/dagster/skills/dagster-expert -type f | wc -l` → expect `173` (Assumptions: other counts).
3. If `C:/Users/jpollock/.omp/agent/skills/dagster-expert` exists (Step 0.2 passed), `rm -rf C:/Users/jpollock/.omp/agent/skills/dagster-expert`. Then `cp -r C:/Users/jpollock/AppData/Local/Temp/dagster-skills-vendor/skills-97d54a45e5f55ca738de4e90937857c1b93168f5/plugins/dagster/skills/dagster-expert C:/Users/jpollock/.omp/agent/skills/dagster-expert` and `cp C:/Users/jpollock/AppData/Local/Temp/dagster-skills-vendor/skills-97d54a45e5f55ca738de4e90937857c1b93168f5/LICENSE C:/Users/jpollock/.omp/agent/skills/dagster-expert/LICENSE`.
4. With the `edit` tool, insert one line `hide: true` directly after line 2 (`name: dagster-expert`) of `skills/dagster-expert/SKILL.md`. No other change to vendored files.

### 3. House skill pack `skills/dagster/` (9 files)

#### `C:/Users/jpollock/.omp/agent/skills/dagster/SKILL.md`
````markdown
---
name: dagster
description: Dagster 1.13 knowledge base (dg projects and components, assets, resources and environments, automation and partitions, testing and asset checks, Dagster+ Hybrid and OSS deployment on AKS, Databricks orchestration). Routed by rule://domain-router.
hide: true
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
````

#### `C:/Users/jpollock/.omp/agent/skills/dagster/project.md`
````markdown
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
````

#### `C:/Users/jpollock/.omp/agent/skills/dagster/assets.md`
````markdown
# Assets and lineage
Tags → skill://dagster/sources.md.

## Modeling
- One `@dg.asset` per persistent object, named for the output (`customers`, not `load_customers`), with a docstring or `description=` and a return annotation. [DG:guides/build/assets/defining-assets, SK:references/assets/INDEX.md]
- Separate assets per phase when phases need their own visibility, retries, selection, or reuse; one asset when simple phases always run together. [DG:guides/build/assets/modeling-etl-pipelines]
- `@dg.multi_asset` when one computation produces several assets; `can_subset=True` only if outputs can materialize independently; `@dg.graph_asset` or `@dg.graph_multi_asset` when an asset needs several ops. [DG:guides/build/assets/defining-assets, DG:guides/build/assets/modeling-etl-pipelines]
- Ops and op jobs (`@dg.op`, `@dg.job`) only for workflows without a persistent asset. [DG:api/dagster/assets, DG:api/dagster/definitions]
- Asset jobs: `dg.define_asset_job(name=..., selection=...)`, launched by schedules, sensors, or the UI. [DG:guides/build/jobs/asset-jobs]

## Keys, groups, and metadata
- `key_prefix` (string or list) builds hierarchical keys; `key=` excludes `name` and `key_prefix`; segments use letters, digits, and underscores. [DG:guides/build/assets/defining-assets, DG:api/dagster/assets]
- Set `group_name` (one group per asset; `/` nests groups from 1.13.9), `owners` (`team:<name>` or email), `kinds={...}` (up to ten; `compute_kind` is superseded), and string `tags` for other dimensions. [DG:guides/build/assets/metadata-and-tags, DG:guides/build/assets/metadata-and-tags/groups, DG:guides/build/assets/metadata-and-tags/kind-tags]
- Per-run metadata: return `dg.MaterializeResult(metadata={...})` (`dg.MaterializeResult[T]` over `dg.Output[T]` when also returning a value); a multi-asset yields one per `asset_key`. [DG:guides/build/assets/metadata-and-tags, SK:references/assets/INDEX.md]
- Table assets publish `dagster/column_schema` so data-contract checks can compare it. [DG:guides/test/data-contracts]
- Keep definition metadata small: repeated per-asset metadata inflates code-location snapshots (130 MB limit on Dagster+). [DG:deployment/dagster-plus/management/snapshot-size-limits]

## Dependencies and data passing
- `deps=[...]` for lineage and ordering when the asset reads storage itself (SQL tables, Delta, files); a function parameter only when an I/O manager loads the upstream value. [DG:guides/build/assets/defining-assets-with-asset-dependencies, DG:guides/build/io-managers]
- No I/O managers for warehouse tables, self-managed storage, or data larger than memory; the default `FilesystemIOManager` pickles to the local filesystem, which isolated run pods don't share. [DG:guides/build/io-managers, DG:deployment/execution/run-retries]
- `deps` takes a list (`deps=[upstream]`, `deps=[dg.AssetDep("upstream")]`): a bare `AssetKey` was removed in 1.13.0 and `non_argument_deps=` is deprecated. [DG:migration/upgrading, GH:MIGRATION.md]
- Cross-code-location inputs: a local `dg.AssetSpec(<key>).with_io_manager_key(...)`, never `SourceAsset`. [DG:guides/build/assets/defining-assets-with-asset-dependencies, GH:MIGRATION.md]

## External and virtual assets
- Data another system produces is a `dg.AssetSpec` (not `SourceAsset`) passed straight to `dg.Definitions`; the owning system's updates arrive as sensor or REST API reports. [DG:guides/build/assets/external-assets, GH:MIGRATION.md, DG:migration/upgrading]
- Report external facts as `dg.AssetObservation` (free on Dagster+) rather than materializations (one credit each). [DG:guides/build/assets/metadata-and-tags/asset-observations, DG:deployment/dagster-plus/management/report-external-system-events]
- Virtual assets (`is_virtual=True`, e.g. views) are preview. [DG:guides/build/assets/virtual-assets]

## Dynamic fanout
- `DynamicOut` with `.map()` and `.collect()` only when every item needs its own visibility and retries (each output can cost a Dagster+ credit); otherwise parallelize inside one asset or op. [DG:examples/best-practices/dynamic-vs-parallel, DG:examples/best-practices/dynamic-fanout]
````

#### `C:/Users/jpollock/.omp/agent/skills/dagster/resources.md`
````markdown
# Resources, configuration, and environments
Tags → skill://dagster/sources.md.

## Resources
- Every external system gets a `dg.ConfigurableResource` subclass: typed config fields plus methods that open the client; assets, checks, schedules, and sensors receive it through an annotated parameter. [DG:guides/build/external-resources/defining-resources, DG:guides/build/external-resources/using-resources]
- Bind resources in `dg.Definitions(resources={...})` returned by a `@dg.definitions` function; plain Python objects only through `dg.ResourceParam`. [DG:guides/build/external-resources/defining-resources, DG:guides/build/external-resources]
- Nested resources are typed fields on the parent (`dg.ResourceDependency[...]`); a child built at module scope and returned from a method is unmanaged and its `EnvVar`s never resolve. [DG:guides/build/external-resources/configuring-resources, DG:guides/operate/configuration/using-environment-variables-and-secrets]
- Per-run state: `setup_for_execution`/`teardown_after_execution` (once per run per process) with `PrivateAttr` fields named `_…`; open clients in context managers. [DG:guides/build/external-resources/managing-resource-state, DG:guides/build/external-resources/connecting-to-databases]
- `dg.Config` and `dg.ConfigurableResource` are Pydantic models: they are the typed records skill://python requires for run parameters and connection settings. [DG:guides/operate/configuration/run-configuration, DG:guides/build/external-resources/managing-resource-state, U]
- Caches live in the resource: `functools.lru_cache` is per process; runs on separate pods need a shared cache. [DG:examples/best-practices/resource-caching]
- `configure_at_launch()` only for fields callers must set per run. [DG:guides/build/external-resources/configuring-resources]

## Environment variables and secrets
- Secret or environment-specific fields take `dg.EnvVar("NAME")` (`dg.EnvVar.int(...)` for integers): resolved at run launch and hidden in the UI; `os.getenv()` during load shows the value in the UI and is only for non-secret selection. [DG:guides/operate/configuration/using-environment-variables-and-secrets, DG:guides/build/external-resources/configuring-resources]
- No passwords, tokens, keys, or connection strings in code, YAML, run config, tags, metadata, or logs. [DG:guides/operate/configuration/using-environment-variables-and-secrets, U]
- Local values: a project-root `.env` (loaded by `dg`) that is never committed, plus a committed `.env.example` naming the required variables; `dg list envs` shows what components need. [SK:references/env-vars.md, DG:api/clis/dg-cli/dg-cli-reference]
- Dagster+: variables set in the UI, scoped per deployment and code location (UI values beat agent config), or per code location in `container_context.yaml`; built-ins `DAGSTER_CLOUD_DEPLOYMENT_NAME`, `DAGSTER_CLOUD_IS_BRANCH_DEPLOYMENT` (`"1"`). [DG:deployment/dagster-plus/management/environment-variables, DG:deployment/dagster-plus/management/environment-variables/agent-config, DG:deployment/dagster-plus/management/environment-variables/built-in]
- AKS: secrets come from Key Vault through the Secrets Store CSI provider with workload identity (`Key Vault Secrets User`). [DG:deployment/dagster-plus/hybrid/azure/key-vault]

## Environments (dev/tst/prd)
- One Dagster deployment per environment (Dagster+ full deployments or one OSS instance each); code reads the environment from a deployment-set variable (`DAGSTER_CLOUD_DEPLOYMENT_NAME` on Dagster+, `ENVIRONMENT` = `dev`|`tst`|`prd` on OSS) and everything else from resource `EnvVar`s. [U, DG:examples/full-pipelines/dagster-plus-deployment/define-assets]
- Catalog names derive from the environment (`f"dwh_{environment}.silver.orders"`); hosts and IDs come from `EnvVar`s. [U]
- Upstream examples say staging/prod: map them to tst/prd; local files are `.env` and `.env.<dev|tst|prd>` (`dg launch --env-file`). [SK:references/env-vars.md, U]
- Branch deployments write only to isolated targets with separate credentials, never production data. [DG:deployment/dagster-plus/deploying-code/branch-deployments/testing-against-prod-data]

## Run config vs partitions
- Partitions for discrete segments that need history, status, schedules, or backfills; `dg.Config` for ad-hoc or unbounded parameters; a partition key plus config for extra options. [DG:examples/best-practices/partitions-vs-config]
- Config classes subclass `dg.Config` and arrive as the `config` parameter; tests pass `dg.RunConfig` to `dg.materialize`. [DG:guides/operate/configuration/run-configuration]

## Azure, SQL Server, Teams
- Azure Storage: `ADLS2Resource` or `AzureBlobStorageResource` (`dagster-azure`) with the `default` credential type (`DefaultAzureCredential`, managed identity included) over SAS tokens or account keys; `ADLS2PickleIOManager` only for pickle-friendly outputs. [DG:integrations/libraries/azure, DG:integrations/libraries/azure/component, DG:integrations/libraries/azure/dagster-azure]
- SQL Server: no first-party integration; wrap the driver in a `dg.ConfigurableResource` with `dg.EnvVar` credentials; `dagster-mssql-bcp` is community-maintained. [DG:integrations/libraries/mssql-bulk-copy-tool, DG:guides/build/external-resources/connecting-to-databases]
- Microsoft Teams: `MSTeamsResource(hook_url=dg.EnvVar("TEAMS_WEBHOOK_URL"))`, `make_teams_on_run_failure_sensor(...)`, `teams_on_failure` hooks; `webserver_base_url` adds run links. [DG:integrations/libraries/msteams, DG:integrations/libraries/msteams/dagster-msteams]
````

#### `C:/Users/jpollock/.omp/agent/skills/dagster/automation.md`
````markdown
# Automation, partitions, and concurrency
Tags → skill://dagster/sources.md.

## Choosing
- Declarative automation (`automation_condition=` on assets and checks) for dependency-aware refresh; schedules for fixed-time jobs; sensors for external polling, side effects, or per-event `run_config`; run-status sensors to react to run outcomes. [DG:guides/automate, DG:guides/automate/declarative-automation/migrating-from-sensors, SK:references/automation/choosing-automation.md]
- Conditions are side-effect free; notifications belong in run-status sensors or alert policies. [DG:guides/automate/declarative-automation/migrating-from-sensors]
- Declarative automation runs only while `default_automation_condition_sensor` is on (Automation tab; stopped by default; evaluates every 30 s). [DG:guides/automate/declarative-automation/automation-condition-sensors, SK:references/automation/declarative-automation/INDEX.md]
- New code uses `AutomationCondition`, never `AutoMaterializePolicy`/`AutoMaterializeRule`; `@multi_asset_sensor` only for side effects (superseded, removal planned for 2.0). [GH:MIGRATION.md, DG:migration/upgrading, DG:api/dagster/schedules-sensors]

## Declarative automation
- `AutomationCondition.eager()`: any upstream update requests the asset; waits while deps are missing or in progress; latest time partition only. [DG:guides/automate/declarative-automation/customizing-automation-conditions/customizing-eager-condition]
- `AutomationCondition.on_cron("<cron>")`: after each tick, requests once every dep has updated since that tick — a synchronization window, not a fixed-time launch; widen the cron if deps can't all finish inside it; latest time partition only. [DG:guides/automate/declarative-automation, DG:guides/automate/declarative-automation/migrating-from-sensors]
- `AutomationCondition.on_missing()`: fills missing partitions once deps exist; skips partitions already present when it was enabled. [DG:guides/automate/declarative-automation/customizing-automation-conditions/customizing-on-missing-condition]
- Customize with `.without(...)`, `.replace(...)`, `&`, `|`, `~` (e.g. drop `in_latest_time_window()` for history); assets that must run together belong in one asset job (job-level conditions are preview). [SK:references/automation/declarative-automation/INDEX.md, DG:guides/automate/declarative-automation/customizing-automation-conditions/customizing-on-cron-condition, BLOG:orchestration-is-more-than-scheduling-declarative-automation-in-dagster]
- Before turning a stopped automation sensor back on, preview its targets: eager may request every partition that became eligible meanwhile. [DG:guides/automate/declarative-automation/customizing-automation-conditions/preventing-runs-on-reactivation]

## Schedules and sensors
- Schedules: `dg.ScheduleDefinition` or `@dg.schedule` with a cron and `execution_timezone` (IANA; UTC by default); partitioned jobs use `build_schedule_from_partitioned_job` and the partition timezone; DST skips or repeats local times. [DG:guides/automate/schedules/defining-schedules, DG:guides/automate/schedules/customizing-execution-timezone]
- Sensors: `minimum_interval_seconds` is a floor; stable `RunRequest.run_key`s deduplicate; progress lives in `context.cursor`/`context.update_cursor(...)`; evaluations time out at 60 s, and work over ~3 min belongs in a job. [DG:guides/automate/sensors, DG:deployment/troubleshooting/sensor-timeouts]
- Sensors start stopped unless `default_status=dg.DefaultSensorStatus.RUNNING`; starting or stopping automation in a deployment is a deployment change. [DG:guides/automate/sensors, U]

## Partitions and backfills
- Time partitions for time windows, static for fixed categories, dynamic for runtime-discovered keys, `dg.MultiPartitionsDefinition` for two axes; at most 100,000 partitions per asset and 25,000 dynamic partition requests per sensor evaluation. [DG:guides/build/partitions-and-backfills/partitioning-assets, DG:api/dagster/schedules-sensors]
- Partitioned assets read and write only their slice (`context.partition_key`, `context.partition_time_window`, or `context.partition_key_range` in single-run backfills) and overwrite it idempotently. [DG:guides/build/partitions-and-backfills/backfilling-data, DG:examples/best-practices/partition-backfill-strategies]
- Explicit mappings through `dg.AssetDep(..., partition_mapping=...)` (`TimeWindowPartitionMapping`, `AllPartitionMapping`, `LastPartitionMapping`, `StaticPartitionMapping`); the default maps equal keys or overlapping windows. [DG:guides/build/partitions-and-backfills/defining-dependencies-between-partitioned-assets, DG:api/dagster/partitions]
- Backfills launch one run per partition by default; `dg.BackfillPolicy.multi_run(max_partitions_per_run=N)` batches; `dg.BackfillPolicy.single_run()` suits range-native compute (fewer Dagster+ credits, whole-range retries). [DG:guides/build/partitions-and-backfills/backfilling-data, DG:examples/best-practices/partition-backfill-strategies, DG:deployment/dagster-plus/management/credit-usage]
- Dagster doesn't delete data for expired partitions: a retention sensor deletes the data and removes the dynamic keys together. [DG:guides/build/partitions-and-backfills/data-retention]

## Concurrency, retries, timeouts
- Shared systems (a SQL Server, a warehouse) get a pool: `@dg.asset(pool="<name>")` plus a limit for it in deployment settings (`concurrency.pools.default_limit` as the fallback); deployment-wide caps via `concurrency.runs.max_concurrent_runs` and `concurrency.runs.tag_concurrency_limits`. [DG:guides/operate/managing-concurrency/concurrency-pools, DG:guides/operate/managing-concurrency/run-queue-limits, DG:guides/operate/managing-concurrency/run-tag-limits]
- With pools, set `run_monitoring.free_slots_after_run_end_seconds` so failed runs release slots. [DG:guides/operate/managing-concurrency/concurrency-pools, DG:deployment/execution/run-monitoring]
- Step retries: `dg.RetryPolicy(max_retries=..., delay=..., backoff=dg.Backoff.EXPONENTIAL)`; non-retryable errors raise `dg.Failure(..., allow_retries=False)`; run retries via the `dagster/max_retries` tag (on by default in Dagster+, `run_retries.enabled: true` in OSS). [DG:guides/build/ops/op-retries, DG:deployment/execution/run-retries]
- Using both: `run_retries.retry_on_asset_or_op_failure: false` limits run retries to crashes; the default `FROM_FAILURE` strategy needs storage readable across runs. [DG:deployment/execution/run-retries]
- Jobs have no default timeout: set the `dagster/max_runtime` tag (seconds) on jobs that can hang. [DG:deployment/execution/job-timeouts, DG:deployment/execution/run-monitoring]
````

#### `C:/Users/jpollock/.omp/agent/skills/dagster/testing.md`
````markdown
# Testing and asset checks
Tags → skill://dagster/sources.md. General pytest conventions: skill://python/testing.md.

## Gates
- Before merge and deploy: `uv run dg check defs` (definitions load; exit 1 on errors), `uv run dg check yaml` and `uv run dg check toml` when components or config changed, then `uv run pytest`. [DG:api/clis/dg-cli/dg-cli-reference, SK:references/cli/check.md]
- One test calls `Definitions.validate_loadable()` on the project's definitions (key conflicts, unresolved jobs, missing resources, bad partition mappings). [DG:api/dagster/definitions]
- Unit tests never reach a Dagster deployment, Databricks, Azure, or SQL Server: resources are mocks or local fakes. [DG:guides/test/unit-testing-assets-and-ops, U]

## Unit tests
- Invoke assets directly with keyword arguments (upstream values, a `Config` instance, mock resources); `dg.build_asset_context(partition_key=...)` when the asset reads its context. [DG:guides/test/unit-testing-assets-and-ops]
- `dg.materialize([...], resources={...})` for wiring tests, upstream assets included; `dg.materialize_to_memory` installs an in-memory I/O manager, so pass none. [DG:api/dagster/execution]
- Test assets, not whole jobs; logic that runs in Databricks is tested in the bundle, the Dagster asset only for its trigger contract. [DG:guides/test/unit-testing-assets-and-ops, U]
- Schedules and sensors: call them directly with `dg.build_schedule_context(scheduled_execution_time=...)` or `dg.build_sensor_context(...)`; check each `RunRequest.run_config` with `dg.validate_run_config(job, run_config)`. [DG:guides/automate/schedules/testing-schedules, DG:guides/automate/sensors/testing-sensors]
- Automation conditions: `dg.evaluate_automation_conditions(defs=..., instance=dg.DagsterInstance.ephemeral(), evaluation_time=...)`, passing `cursor=result.cursor` between ticks; assert `total_requested` or `get_requested_partitions(key)`. [DG:api/dagster/assets, BLOG:orchestration-is-more-than-scheduling-declarative-automation-in-dagster]
- Resources: construct them directly; context-dependent methods get `dg.build_init_resource_context(...)`. [DG:guides/build/external-resources/testing-configurable-resources]
- Components: `dg.components.testing.create_defs_folder_sandbox()` for custom components; `ComponentTree.for_project(...)` to load and inspect instances. [DG:guides/build/components/creating-new-components/testing-your-component, DG:guides/build/components/building-pipelines-with-components/testing-component-definitions]
- Partitioned config: `get_partition_keys()`, `get_run_config_for_partition_key(key)`, `job.execute_in_process(partition_key=...)`. [DG:guides/test/testing-partitioned-config-and-jobs]
- A sensor test evaluation in the UI runs the sensor function for real, side effects included. [DG:guides/automate/sensors/testing-sensors]

## Asset checks
- One property per check (`@dg.asset_check(asset=...)` or `@dg.multi_asset_check`) returning `dg.AssetCheckResult(passed=..., metadata=...)`; `severity=dg.AssetCheckSeverity.ERROR` for hard failures (default `WARN`). [DG:guides/test/asset-checks]
- `blocking=True` stops downstream materialization when the check fails. [DG:guides/test/asset-checks]
- Partitioned checks share the asset's `partitions_def` (preview). [DG:guides/test/asset-checks]
- Data contracts: compare `dagster/column_schema` metadata against a versioned contract inside a check. [DG:guides/test/data-contracts]
- Checks cost no Dagster+ credits. [DG:guides/test/asset-checks]
- Freshness: `dg.FreshnessPolicy.time_window(fail_window=..., warn_window=...)` or `dg.FreshnessPolicy.cron(deadline_cron=..., lower_bound_delta=...)` (OSS needs `freshness.enabled: True`, preview); not `build_*_freshness_checks` (superseded 1.12) or `LegacyFreshnessPolicy`. [DG:guides/observe/asset-freshness-policies, DG:about/changelog]

## Logging and observability
- Log with `context.log` or `dg.get_dagster_logger()`; plain `logging` loggers reach the event log only when listed in `dagster.yaml` `python_logs.managed_python_loggers`. [DG:guides/log-debug/logging, DG:guides/log-debug/logging/python-logging]
- No PII or secrets in logs or metadata; where compute logs can carry PII, a custom compute log manager redacts on write (nothing reaches disk) or on read. [DG:examples/best-practices/pii-compute-logs, U]
- Windows or Azure hosts missing compute logs: set `PYTHONLEGACYWINDOWSSTDIO=1` and restart. [DG:guides/log-debug/logging]
- Dagster+ alerts need a notification service plus alert policies (asset, run, automation, code location); asset-health alerts fire on status transitions. [DG:guides/observe/alerts, DG:guides/observe/alerts/alert-policy-types]
````

#### `C:/Users/jpollock/.omp/agent/skills/dagster/deploy.md`
````markdown
# Deploying and operating Dagster
Tags → skill://dagster/sources.md. Both deployment models are covered; the repo's deployment files decide which applies (`build.yaml`/`container_context.yaml` → Dagster+ Hybrid, `dagster.yaml` or Helm values → OSS). [U]

## Shared
- Images: multi-stage `uv` build with runtime dependencies only (`uv sync --no-dev`), tagged with the commit SHA; deployments reference that immutable tag, never a branch tag. [DG:examples/full-pipelines/dagster-plus-deployment/containerize, DG:deployment/dagster-plus/deploying-code/configuring-ci-cd]
- Promotion dev → tst → prd through Azure DevOps pipelines, one Dagster deployment per environment; no workstation deploys. [U, DG:examples/full-pipelines/dagster-plus-deployment/cicd]
- Capacity: size run concurrency from measured run shapes (run pod plus step pods), node-pool allocatable CPU and memory, and Azure quota; Dagster queue limits stay below that envelope. [BLOG:the-data-plane-is-yours-dagster-hybrid-on-kubernetes-and-azure]
- A Kubernetes Job retry is not a Dagster run retry; Dagster owns run retry policy. [BLOG:the-data-plane-is-yours-dagster-hybrid-on-kubernetes-and-azure]
- Upgrades: read the upgrade guide for each minor; move core 1.13.x and libraries 0.29.x together at matching patch levels. [DG:migration/upgrading, DG:about/releases]

## Dagster+ Hybrid on AKS
- Dagster+ hosts the UI, GraphQL API, metadata, and daemons; the agent, code servers, and run pods run in AKS with outbound-only connections to Dagster+. [DG:deployment/dagster-plus/hybrid/architecture]
- Agent: Helm chart `dagster-cloud/dagster-cloud-agent`; agent token in a Kubernetes Secret (`DAGSTER_CLOUD_AGENT_TOKEN`), or from Key Vault through CSI with chart 1.10.2+ (`dagsterCloud.agentTokenSecretName`); run-pod settings go under `workspace`, never the OSS `runLauncher` key. [DG:deployment/dagster-plus/hybrid/kubernetes/setup, DG:deployment/dagster-plus/hybrid/azure/key-vault, DG:examples/full-pipelines/dagster-plus-deployment/kubernetes-agents]
- Upgrade the agent before any code location adopts a newer Dagster, and at least every six months; a separate agent serves branch deployments (`dagsterCloud.branchDeployments: true`). [BLOG:the-data-plane-is-yours-dagster-hybrid-on-kubernetes-and-azure, DG:deployment/dagster-plus/hybrid/kubernetes/setup]
- Images live in ACR attached to AKS (`az aks update --attach-acr`); compute logs go to Blob or ADLS through `AzureBlobComputeLogManager` with workload identity (`Storage Blob Data Contributor`). [DG:deployment/dagster-plus/hybrid/azure/acr-user-code, DG:deployment/dagster-plus/hybrid/azure/blob-compute-logs]
- New `dg` projects: `build.yaml` (`registry`, `directory`), `container_context.yaml` (`env_vars`, `k8s`, `k8s.env_secrets`), `[tool.dg.project]` in `pyproject.toml`; `dagster_cloud.yaml` only where it already exists. [DG:deployment/dagster-plus/management/build-yaml, SK:references/deployment/config-files.md]
- CI: `dagster-cloud` in the runtime image, `dagster-dg-cli` as a dev dependency, `DAGSTER_CLOUD_API_TOKEN` as a secret pipeline variable; `dg plus deploy configure` scaffolds only GitHub or GitLab, so Azure DevOps runs the documented non-interactive `dg plus deploy` steps; `dg plus deploy start` replaces `dagster-cloud ci check`. [DG:deployment/dagster-plus/deploying-code/configuring-ci-cd, DG:about/changelog]
- Branch deployments per pull request against isolated data; full deployments for dev, tst, prd; the Dagster+ Terraform provider (`dagster-io/dagsterplus` `~> 0.1`) is early-access preview. [DG:deployment/dagster-plus/deploying-code/branch-deployments, DG:deployment/dagster-plus/deploying-code/full-deployments, DG:deployment/dagster-plus/management/terraform]
- Code-location snapshots stay under 130 MB; `DAGSTER_REDACT_USER_CODE_ERRORS=1` masks user-code errors in the UI; production runs are isolated. [DG:deployment/dagster-plus/management/snapshot-size-limits, DG:deployment/dagster-plus/management/managing-compute-logs-and-error-messages, DG:deployment/dagster-plus/run-isolation]

## OSS on AKS (Helm)
- Services: `dagster-webserver` (replicas allowed), `dagster-daemon` (schedules, sensors, run queue, monitoring), and one code server per code location; instance config in `$DAGSTER_HOME/dagster.yaml`. [DG:deployment/oss/oss-deployment-architecture, DG:deployment/execution/dagster-daemon]
- Storage: PostgreSQL (`dagster-postgres`, database in UTC) under `storage.postgres` with `env:` values; an external database uses `postgresql.enabled: false` and `global.postgresqlSecretName`. [DG:deployment/oss/oss-instance-configuration, DG:deployment/oss/dagster-yaml, DG:deployment/oss/deployment-options/kubernetes/customizing-your-deployment]
- Charts from `https://dagster-io.github.io/helm`: `dagster` (system) and `dagster-user-deployments` (code locations) as separate releases, so code ships independently. [DG:deployment/oss/deployment-options/kubernetes/deploying-to-kubernetes, DG:deployment/oss/deployment-options/kubernetes/customizing-your-deployment]
- Runs are Kubernetes Jobs through `K8sRunLauncher`; defaults in `runLauncher.config.k8sRunLauncher.runK8sConfig`, per-job overrides with the `dagster-k8s/config` tag; `k8s_job_executor` step pods need `step_k8s_config`. [DG:deployment/execution/run-launchers, DG:deployment/oss/deployment-options/kubernetes/customizing-your-deployment]
- The queued run coordinator is the default since 1.10 and needs the daemon; turn on `run_monitoring.enabled: true` and `run_retries.enabled: true`. [DG:about/changelog, DG:deployment/execution/run-monitoring, DG:deployment/execution/run-retries]
- Minor upgrades: back up Postgres, scale webserver and daemon to 0, run the chart's migration Job (`migrate.enabled=true`), then restore. [DG:deployment/oss/deployment-options/kubernetes/migrating-while-upgrading]
- Database hygiene: routine `VACUUM`, never routine `VACUUM FULL`; grow storage before bulk cleanup. [DG:deployment/troubleshooting/database-tuning]
````

#### `C:/Users/jpollock/.omp/agent/skills/dagster/databricks.md`
````markdown
# Orchestrating Databricks from Dagster
Tags → skill://dagster/sources.md. Databricks-side design (pipelines, tables, bundle): skill://databricks-platform.

## Ownership
- The Databricks `data_platform` bundle defines and deploys jobs, pipelines, and compute; Dagster triggers deployed jobs and records their runs. No cluster specs, `jobs.submit`/`jobs.create`, `create_databricks_submit_run_op`, or Pipes one-time runs in Dagster code unless asked. [U, DG:integrations/libraries/databricks]
- The Databricks components are preview: `DatabricksWorkspaceComponent` (state-backed; one asset per task of discovered jobs; triggers and monitors job runs) and `DatabricksAssetBundleComponent` (assets from `databricks.yml` tasks; its execution call is undocumented) need explicit approval. [DG:integrations/libraries/databricks/databricks-workspace-component, DG:integrations/libraries/databricks/databricks-asset-bundle-component, DG:about/releases]

## Triggering bundle jobs
- An asset calls a `dg.ConfigurableResource` that resolves the job by exact name (`jobs.list(name=...)`, exactly one match) and runs it with `jobs.run_now_and_wait(job_id=..., job_parameters={...}, timeout=...)`; a failed run raises, failing the asset. [DG:integrations/libraries/databricks/pipes/serverless-compute, DBSDK:workspace/jobs/jobs]
- SDK waiters time out after 20 minutes by default: pass `timeout=` sized to the job. [DBSDK:workspace/jobs/jobs]
- Job IDs and hosts differ per workspace: resolve jobs by name at run time; hosts come from `dg.EnvVar("DATABRICKS_HOST")`. [U]
- Partitioned assets pass their slice as job parameters (`{"run_date": context.partition_key}`) and the job overwrites that slice. [DG:guides/build/partitions-and-backfills/backfilling-data, U]
- Record `databricks_run_id` in `dg.MaterializeResult` metadata and tag the asset `kinds={"databricks"}`. [DG:integrations/libraries/databricks/pipes/serverless-compute, DG:guides/build/assets/metadata-and-tags/kind-tags]
- Lakeflow pipelines: trigger the bundle job that runs them; without one, `pipelines.start_update(pipeline_id=...)` with the id from an `EnvVar`, then poll `pipelines.get_update(...)` until the update finishes. [U, DBSDK:workspace/pipelines/pipelines]
- Tables Databricks maintains without a Dagster trigger are `dg.AssetSpec`s reported by observation. [DG:guides/build/assets/external-assets, DG:guides/build/assets/metadata-and-tags/asset-observations]

```python
from datetime import timedelta

import dagster as dg
from databricks.sdk import WorkspaceClient


class DatabricksJobs(dg.ConfigurableResource):
    """Runs bundle-deployed Databricks jobs by name."""

    host: str
    timeout_minutes: int = 120

    def run(self, job_name: str, job_parameters: dict[str, str]) -> int:
        """Runs the single job named job_name, waits for it, and returns its run id."""
        workspace = WorkspaceClient(host=self.host)
        matches = list(workspace.jobs.list(name=job_name))
        if len(matches) != 1:
            raise dg.Failure(f"expected one Databricks job named {job_name}, found {len(matches)}", allow_retries=False)
        run = workspace.jobs.run_now_and_wait(
            job_id=matches[0].job_id,
            job_parameters=job_parameters,
            timeout=timedelta(minutes=self.timeout_minutes),
        )
        return run.run_id


@dg.asset(partitions_def=dg.DailyPartitionsDefinition(start_date="2026-01-01"), kinds={"databricks"})
def orders_daily(context: dg.AssetExecutionContext, databricks: DatabricksJobs) -> dg.MaterializeResult:
    """Daily orders, refreshed by the bundle job orders_refresh."""
    run_id = databricks.run("orders_refresh", {"run_date": context.partition_key})
    return dg.MaterializeResult(metadata={"databricks_run_id": run_id})


@dg.definitions
def resources() -> dg.Definitions:
    """Binds the Databricks resource for this code location."""
    return dg.Definitions(resources={"databricks": DatabricksJobs(host=dg.EnvVar("DATABRICKS_HOST"))})
```

## Connection and identity
- `WorkspaceClient` uses Databricks unified auth from the deployment's environment (Azure managed identity or an OAuth M2M service principal); PATs only for local development, never in code, YAML, or config. [DBSDK:authentication, U]
- `DatabricksClientResource` (`dagster-databricks`) takes exactly one of `token`, `oauth_credentials`, `azure_credentials`, `credentials_strategy`. [DG:integrations/libraries/databricks/dagster-databricks]

## Pipes and Databricks Connect (explicit request only)
- Pipes (`PipesDatabricksServerlessClient` with an existing Unity Catalog volume, `PipesDatabricksClient` with `jobs.SubmitTask`) submits one-time runs with Dagster-defined compute; the external code wraps work in `open_dagster_pipes(...)` and reports a materialization only after persisting its output. [DG:integrations/libraries/databricks/pipes/serverless-compute, DG:integrations/libraries/databricks/pipes/classic-clusters, DG:integrations/external-pipelines]
- Databricks Connect keeps Python in the Dagster process with remote Spark: never for long or large batch work. [DG:integrations/libraries/databricks/databricks-connect]
- Step launchers (`databricks_pyspark_step_launcher`) are superseded by Pipes. [DG:migration/upgrading, DG:integrations/libraries/databricks/dagster-databricks]

## Local platform (observed 2026-09-25; repo config wins)
- One Databricks workspace per environment (dev, tst, prd) on a shared Unity Catalog metastore; catalogs `dwh_<env>`, `sandbox_<env>`, `finance_analytics_<env>`. [U]
- Jobs and pipelines come from the `data_platform` bundle; the orchestration principal is `orchestration_mi`; CI/CD runs in Azure DevOps. [U]
````

#### `C:/Users/jpollock/.omp/agent/skills/dagster/sources.md`
````markdown
# Dagster KB sources
Verified 2026-09-25 against docs.dagster.io (latest 1.13.24), Dagster blog posts, the vendored skill://dagster-expert (dagster-io/skills @ `97d54a45e5f55ca738de4e90937857c1b93168f5`), Dagster `MIGRATION.md`, PyPI, and the Databricks SDK for Python docs. Re-verify on every Dagster minor (next: 1.14) and whenever skill://dagster-expert is re-vendored.

| tag | source |
|---|---|
| `DG:<p>` | https://docs.dagster.io/<p> (API reference under `DG:api/…`) |
| `BLOG:<slug>` | https://dagster.io/blog/<slug> |
| `SK:<p>` | skill://dagster-expert/<p> (upstream https://github.com/dagster-io/skills/blob/97d54a45e5f55ca738de4e90937857c1b93168f5/plugins/dagster/skills/dagster-expert/<p>) |
| `GH:<p>` | https://github.com/dagster-io/dagster/blob/master/<p> |
| `PYPI:<pkg>` | https://pypi.org/project/<pkg>/ |
| `DBSDK:<p>` | https://databricks-sdk-py.readthedocs.io/en/latest/<p>.html |
| `U` | user decisions and environment, observed 2026-09-25: AGENTS.md (dev/tst/prd, read-only external systems, uv), Databricks `data_platform` bundle ownership and platform facts, Azure DevOps CI |

## Snapshot
- Versions (PyPI, 2026-09-21): `dagster`, `dagster-dg-cli`, `create-dagster`, `dagster-webserver`, `dagster-cloud`, `dagster-pipes` 1.13.24; `dagster-postgres`, `dagster-k8s`, `dagster-databricks`, `dagster-azure`, `dagster-msteams` 0.29.24; Python `>=3.10,<3.15` (3.9 dropped in 1.12.2).
- Releases about weekly; stable APIs follow semver within 1.x; preview may break in patches, beta in minors; libraries stay 0.y.z.
- Preview in 1.13.24: `DatabricksAssetBundleComponent`, `DatabricksWorkspaceComponent`, Azure resource components, virtual assets, partitioned asset checks, job-level automation conditions, freshness policies on OSS; the Dagster+ Terraform provider is early-access preview.
- Removed in 1.13.0: `external_asset_from_spec`/`external_assets_from_specs`, single-`AssetKey` `deps`, `Definitions.get_all_asset_specs`, `legacy_freshness_policy` loader arguments; removed in 1.12.6: the `dagster project` CLI group.
- Prefect is acquiring Dagster Labs (announced 2026-07-13); Dagster keeps its name and open-source license, and Dagster+ stays supported.
- Vendored skill: `dagster-expert` from dagster-io/skills `release-stable` @ `97d54a45e5f55ca738de4e90937857c1b93168f5` (1.13.24, 2026-09-21), Apache-2.0 (`LICENSE` copied beside it); 173 upstream files; the only local change is `hide: true` in its `SKILL.md` frontmatter.

## Conflicts resolved
- skill://dagster-expert recommends `dg launch`, `dg api` writes, `dg plus deploy`, state refresh, and Dagster+ MCP actions; AGENTS.md makes external systems read-only → only the reads in skill://dagster §Diagnose run without explicit permission.
- skill://dagster-expert shows `pip install -e .` once and calls uv optional → uv only (`uv sync`, `uv add`, `uv run dg …`).
- Upstream examples use development/staging/production → house environments are dev/tst/prd.
- `dg list env` (components guide) vs `dg list envs` (CLI reference, skill) → `dg list envs`.
- Freshness: `build_*_freshness_checks` superseded since 1.12 while freshness policies are preview on OSS → new freshness rules use `dg.FreshnessPolicy`; existing checks stay until migrated.
- Partition limits: ≤100,000 partitions per asset (UI) and ≤25,000 dynamic partition requests per sensor evaluation → both apply.
- Databricks: docs recommend `new_cluster` for classic Pipes, and the components submit tasks themselves; the bundle owns compute (U) → Dagster triggers deployed jobs by name; Pipes, submit runs, and the preview components need explicit approval.
- `DatabricksAssetBundleComponent` does not say whether it calls `run_now` or `submit` → never a default until verified for the pinned version.
- Dagster+ Hybrid config: `build.yaml` + `container_context.yaml` + `[tool.dg.project]` for new projects vs `dagster_cloud.yaml` in the CI example → the three-file layout; `dagster_cloud.yaml` only where it already exists.
- `@repository`, `load_assets_from_modules`, `with_resources`, and function-style `@resource` carry no deprecation in the 1.10–1.13 notes → existing projects keep them; new code uses `defs/` autoloading and `ConfigurableResource`.
````

### 4. TTSR rules (5 files in `rules/`)
Reminders in the sibling-rule format; `interruptMode` per Step 0.5; file names per Step 0.3. Generic tokens (`new_cluster`, `os.getenv`, catalog names) are scoped to Dagster definition paths (`**/defs/**`, `**/definitions.py`) so Airflow and Databricks code never matches; Dagster-only tokens (`dg-legacy-apis`) cover all `*.py`.

#### `C:/Users/jpollock/.omp/agent/rules/dg-legacy-apis.md`
````markdown
---
description: "Dagster 1.13: deprecated or removed APIs have replacements (AutomationCondition, AssetSpec, deps lists, FreshnessPolicy, kinds)"
condition:
  - '\bAutoMaterialize(?:Policy|Rule)\b'
  - '\bauto_materialize_policy\s*='
  - '\bSourceAsset\s*\('
  - '\bnon_argument_deps\s*='
  - '\bexternal_assets?_from_specs?\s*\('
  - '\bget_all_asset_specs\s*\('
  - '\bLegacyFreshnessPolicy\b'
  - '\blegacy_freshness_polic(?:y|ies_by_output_name)\s*='
  - '\bbuild_\w+_freshness_checks\s*\('
  - '\basset_partition(?:_key|_keys|_key_range|s_time_window)_for_output\s*\('
  - '\bcompute_kind\s*='
  - '\bdagster_embedded_elt\b'
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
Dagster 1.13 code uses the current APIs; these are deprecated, superseded, or removed.

| avoid | use |
|---|---|
| `AutoMaterializePolicy`, `AutoMaterializeRule`, `auto_materialize_policy=` | `automation_condition=dg.AutomationCondition.eager()` / `.on_cron("…")` / `.on_missing()` |
| `SourceAsset(...)` | `dg.AssetSpec(...)`; IO manager key via `.with_io_manager_key(...)` |
| `external_asset_from_spec(...)`, `external_assets_from_specs(...)` (removed 1.13.0) | `dg.AssetSpec` objects passed to `dg.Definitions(assets=[...])` |
| `non_argument_deps=`, `deps=dg.AssetKey(...)` | `deps=[upstream]` or `deps=[dg.AssetDep("upstream")]` |
| `Definitions.get_all_asset_specs()` (removed 1.13.0) | `Definitions.resolve_all_asset_specs()` |
| `LegacyFreshnessPolicy`, `legacy_freshness_policy=`, `build_*_freshness_checks(...)` | `freshness_policy=dg.FreshnessPolicy.time_window(fail_window=...)` or `dg.FreshnessPolicy.cron(deadline_cron=..., lower_bound_delta=...)` |
| `context.asset_partition_key_for_output()` and siblings | `context.partition_key`, `context.partition_keys`, `context.partition_key_range`, `context.partition_time_window` |
| `compute_kind="…"` | `kinds={"…"}` |
| `dagster_embedded_elt` | `dagster_sling` or `dagster_dlt` |

Details: skill://dagster/assets.md, skill://dagster/automation.md.
Exception: projects pinned below the Dagster version that introduced a replacement keep the old API until upgraded.
````

#### `C:/Users/jpollock/.omp/agent/rules/dg-envvar-secrets.md`
````markdown
---
description: "Dagster definitions: secrets come from dg.EnvVar, never os.getenv/os.environ at load time"
condition:
  - '(?i)\bos\.(?:getenv|environ\.get)\s*\(\s*["''][a-z0-9_]*(?:password|passwd|secret|token|(?:api_?|access_|private_|account_)key|credential|conn(?:ection)?_?str(?:ing)?)[a-z0-9_]*["'']'
  - '(?i)\bos\.environ\s*\[\s*["''][a-z0-9_]*(?:password|passwd|secret|token|(?:api_?|access_|private_|account_)key|credential|conn(?:ection)?_?str(?:ing)?)[a-z0-9_]*["'']\s*\]'
scope: "tool:edit(**/defs/**/*.py), tool:write(**/defs/**/*.py), tool:edit(**/definitions.py), tool:write(**/definitions.py)"
interruptMode: never
---
`dg.EnvVar` resolves when a run launches and stays hidden in the UI; a value read with `os.getenv` while definitions load is baked into resource config and shown in the UI.

## Avoid

```python
import os

import dagster as dg


@dg.definitions
def resources() -> dg.Definitions:
    return dg.Definitions(resources={"sql_server": SqlServerResource(password=os.getenv("SQL_SERVER_PASSWORD"))})
```

## Use

```python
import dagster as dg


@dg.definitions
def resources() -> dg.Definitions:
    return dg.Definitions(resources={"sql_server": SqlServerResource(password=dg.EnvVar("SQL_SERVER_PASSWORD"))})
```

- Integers: `dg.EnvVar.int("NAME")`; component YAML: `{{ env.NAME }}`.
- Values come from the deployment (Dagster+ environment variables, Kubernetes Secrets from Key Vault) or a local `.env` that is never committed. Details: skill://dagster/resources.md.
Exception: tests and scripts outside Dagster definitions.
````

#### `C:/Users/jpollock/.omp/agent/rules/dg-env-literals.md`
````markdown
---
description: "Dagster code is environment-agnostic: no dev/tst/prd catalog names or Databricks workspace hosts"
condition:
  - '(?i)\b(?:dwh|sandbox|finance_analytics)_(?:dev|tst|prd)\b'
  - '(?i)\badb-\d+\.\d+\.azuredatabricks\.net\b'
scope: "tool:edit(**/defs/**/*.{py,sql,yaml,yml}), tool:write(**/defs/**/*.{py,sql,yaml,yml}), tool:edit(**/definitions.py), tool:write(**/definitions.py)"
interruptMode: never
---
One codebase deploys to dev, tst, and prd; environment names and hosts come from the deployment's environment variables.

| avoid | use |
|---|---|
| `"dwh_prd.silver.orders"` | `f"dwh_{os.environ['ENVIRONMENT']}.silver.orders"` (Dagster+: derive the name from `DAGSTER_CLOUD_DEPLOYMENT_NAME`) |
| `host="https://adb-1234567890123456.7.azuredatabricks.net"` | `host=dg.EnvVar("DATABRICKS_HOST")` |
| `host: https://adb-1234567890123456.7.azuredatabricks.net` in `defs.yaml` | `host: "{{ env.DATABRICKS_HOST }}"` |

Details: skill://dagster/resources.md (Environments).
Exception: tests and fixtures that assert per-environment values.
````

#### `C:/Users/jpollock/.omp/agent/rules/dg-databricks-bundle-owned.md`
````markdown
---
description: "Databricks jobs, pipelines, and compute are bundle-owned; Dagster triggers deployed jobs, never defines clusters or one-time runs"
condition:
  - '\bnew_cluster\b'
  - '\bjobs\.SubmitTask\b'
  - '\bPipesDatabricks(?:Serverless)?Client\b'
  - '\bcreate_databricks_submit_run_op\b'
  - '\.jobs\.(?:submit(?:_and_wait)?|create)\s*\('
scope: "tool:edit(**/defs/**/*.{py,yaml,yml}), tool:write(**/defs/**/*.{py,yaml,yml}), tool:edit(**/definitions.py), tool:write(**/definitions.py)"
interruptMode: never
---
The Databricks `data_platform` bundle defines and deploys jobs, pipelines, and compute; Dagster triggers deployed jobs and records their runs.

| avoid | use |
|---|---|
| `PipesDatabricksClient` with `jobs.SubmitTask(new_cluster={...})` | a bundle job + `workspace.jobs.run_now_and_wait(job_id=<resolved by name>, job_parameters={...})` inside a resource |
| `workspace.jobs.submit(...)`, `workspace.jobs.create(...)`, `create_databricks_submit_run_op(...)` | jobs declared in the bundle, triggered by name |
| cluster specs in Dagster code or `defs.yaml` | bundle compute (serverless or bundle job clusters) |

Details: skill://dagster/databricks.md.
Exception: the user explicitly asks for Dagster-defined Databricks runs (Pipes).
````

#### `C:/Users/jpollock/.omp/agent/rules/dg-load-time-io.md`
````markdown
---
description: "Dagster definition modules: no API, database, HTTP, or Spark calls at module level; they run on every code-location load"
condition:
  - '(?m)^[A-Za-z_][^#\n]*\b(?:requests|httpx|urllib\.request)\.\w+\s*\('
  - '(?m)^(?!class\s|def\s|async\s)[A-Za-z_][^#\n]*\bWorkspaceClient\s*\('
  - '(?m)^[A-Za-z_][^#\n]*\b(?:pyodbc|pymssql|psycopg2?)\.connect\s*\('
  - '(?m)^[A-Za-z_][^#\n]*\bspark\.(?:read|sql|table)\b'
scope: "tool:edit(**/defs/**/*.py), tool:write(**/defs/**/*.py), tool:edit(**/definitions.py), tool:write(**/definitions.py)"
interruptMode: never
---
Module code in Dagster definition modules runs whenever a code location loads (deploys, reloads, `dg check defs`); external calls there make loading slow and dependent on those systems.

## Avoid

```python
from databricks.sdk import WorkspaceClient

JOBS = [job.settings.name for job in WorkspaceClient().jobs.list()]
```

## Use

```python
import dagster as dg


@dg.asset(kinds={"databricks"})
def orders_daily(databricks: DatabricksJobs) -> dg.MaterializeResult:
    run_id = databricks.run("orders_refresh", {})
    return dg.MaterializeResult(metadata={"databricks_run_id": run_id})
```

- Clients open inside resources at run time; definitions built from external metadata use a state-backed component whose state refreshes in CI (`dg utils refresh-defs-state`).
- `@dg.definitions` functions follow the same rule. Details: skill://dagster/project.md.
Exception: cheap local reads of files shipped with the project (YAML or JSON beside the module).
````

### Execution
Main agent: Step 0, Step 2, then (AGENTS.md: fan out, smol model for writes) one `task` batch of three `sonic` subagents that copy their files byte-exact from this plan file (`C:/Users/jpollock/.omp/agent/sessions/-src/2026-09-25T21-11-19-557Z_01a0da68-8b05-729a-9aec-7340fddf2bd3/local/dagster-domain-knowledge-plan.md`), applying only the Step 0.3 file-name fallback and the Step 0.5 `interruptMode` value: (a) Step 1A (or 1B per Step 0.4) + the five Step 4 rules; (b) `SKILL.md`, `sources.md`, `project.md`, `assets.md`; (c) `resources.md`, `automation.md`, `testing.md`, `deploy.md`, `databricks.md`. Main agent then runs Verification.

## Critical files & anchors
- `C:/Users/jpollock/.omp/agent/rules/domain-router.md` — shared by every domain session; upsert only the `dagster` row (last table row today is `airflow`).
- `C:/Users/jpollock/.omp/agent/skills/dagster-expert/SKILL.md` — vendored; the single local edit is `hide: true` after line 2; re-vendoring replaces the directory.
- `C:/Users/jpollock/.omp/agent/skills/dagster/SKILL.md` — `hide: true` + `description` start `Dagster 1.13 knowledge base` (Step 0.1 identity); `## Topics` routes to topic files and skill://dagster-expert.
- `C:/Users/jpollock/.omp/agent/rules/af-sdk-imports.md` — source of the `interruptMode` value (the harness plan may flip it to `tool-only`).
- `C:/Users/jpollock/.omp/agent/extensions/lib/domains.ts` — only if present (Step 1B).

## Verification
Use the Step 0.3 rule names in every command. Scratch files go under `C:/Users/jpollock/AppData/Local/Temp/`.

1. `omp ttsr list` → the five `dg-*` rules appear with conditions and scopes exactly as written (no `.*` condition; only the listed `tool:edit(...)`/`tool:write(...)` scope tokens).
2. Per rule: `omp ttsr test --rule C:/Users/jpollock/.omp/agent/rules/<rule>.md --source tool <flags> '<snippet>'` → positive reports the rule triggered, negative reports nothing triggered (snippet = text inside the outer code span, leading spaces included).

| rule | flags | positive | negative |
|---|---|---|---|
| `dg-legacy-apis` | `--tool edit --path probe.py` | `from dagster import AutoMaterializePolicy` | `automation_condition=dg.AutomationCondition.eager(),` |
| `dg-envvar-secrets` | `--tool edit --path src/orders/defs/resources.py` | `password=os.getenv("SQL_SERVER_PASSWORD"),` | `password=dg.EnvVar("SQL_SERVER_PASSWORD"),` |
| `dg-env-literals` | `--tool edit --path src/orders/defs/orders.py` | `TABLE = "dwh_prd.silver.orders"` | `table = f"dwh_{environment}.silver.orders"` |
| `dg-databricks-bundle-owned` | `--tool edit --path src/orders/defs/orders.py` | `task = jobs.SubmitTask(task_key="orders", new_cluster=cluster_spec)` | `run = workspace.jobs.run_now_and_wait(job_id=job_id, job_parameters=params)` |
| `dg-load-time-io` | `--tool write --path src/orders/defs/jobs.py` | `JOBS = [job.settings.name for job in WorkspaceClient().jobs.list()]` | `    workspace = WorkspaceClient(host=self.host)` |

3. Edge cases, same command shape:

| rule | flags | snippet | expect |
|---|---|---|---|
| `dg-legacy-apis` | `--tool edit --path src/orders/defs/legacy.py` | `orders = SourceAsset(key="orders")` | triggered (nested path under `*.py`) |
| `dg-legacy-apis` | `--tool edit --path probe.py` | `orders = dg.AssetSpec(key="orders")` | nothing |
| `dg-legacy-apis` | `--tool edit --path probe.py` | `@dg.asset(compute_kind="databricks")` | triggered |
| `dg-legacy-apis` | `--tool edit --path probe.py` | `@dg.asset(kinds={"databricks"})` | nothing |
| `dg-legacy-apis` | `--tool edit --path probe.py` | `specs = external_assets_from_specs(specs)` | triggered |
| `dg-legacy-apis` | `--tool edit --path probe.py` | `from dagster_embedded_elt.sling import sling_assets` | triggered |
| `dg-legacy-apis` | `--tool edit --path probe.py` | `freshness_policy=dg.FreshnessPolicy.time_window(fail_window=timedelta(hours=24)),` | nothing |
| `dg-envvar-secrets` | `--tool edit --path src/orders/definitions.py` | `token = os.environ["DATABRICKS_TOKEN"]` | triggered |
| `dg-envvar-secrets` | `--tool edit --path definitions.py` | `conn = os.getenv("ILS_CONNECTION_STRING")` | triggered (root `definitions.py`) |
| `dg-envvar-secrets` | `--tool edit --path src/orders/defs/resources.py` | `environment = os.getenv("ENVIRONMENT", "dev")` | nothing |
| `dg-envvar-secrets` | `--tool edit --path tests/test_resources.py` | `password=os.getenv("SQL_SERVER_PASSWORD"),` | nothing (scope) |
| `dg-env-literals` | `--tool write --path src/orders/defs/databricks/defs.yaml` | `  host: https://adb-1234567890123456.7.azuredatabricks.net` | triggered |
| `dg-env-literals` | `--tool write --path src/orders/defs/databricks/defs.yaml` | `  host: "{{ env.DATABRICKS_HOST }}"` | nothing |
| `dg-env-literals` | `--tool edit --path src/orders/defs/sql/orders.sql` | `SELECT * FROM DWH_TST.SILVER.ORDERS` | triggered |
| `dg-env-literals` | `--tool edit --path dags/orders.py` | `TABLE = "dwh_prd.silver.orders"` | nothing (scope) |
| `dg-databricks-bundle-owned` | `--tool edit --path src/orders/defs/orders.py` | `pipes_databricks: PipesDatabricksServerlessClient,` | triggered |
| `dg-databricks-bundle-owned` | `--tool edit --path src/orders/defs/orders.py` | `run = workspace.jobs.submit(run_name="orders", tasks=[task]).result()` | triggered |
| `dg-databricks-bundle-owned` | `--tool write --path src/orders/defs/databricks/defs.yaml` | `  new_cluster:` | triggered |
| `dg-databricks-bundle-owned` | `--tool edit --path dags/orders.py` | `new_cluster={"spark_version": "15.4.x-scala2.12"},` | nothing (scope) |
| `dg-load-time-io` | `--tool edit --path src/orders/defs/jobs.py` | `response = requests.get("https://example.com/api/tables")` | triggered |
| `dg-load-time-io` | `--tool edit --path src/orders/definitions.py` | `conn = pyodbc.connect(dsn)` | triggered |
| `dg-load-time-io` | `--tool edit --path src/orders/defs/jobs.py` | `ENGINE = sqlalchemy.create_engine(url)` | nothing |
| `dg-load-time-io` | `--tool edit --path src/orders/defs/jobs.py` | `from databricks.sdk import WorkspaceClient` | nothing |
| `dg-load-time-io` | `--tool edit --path tests/test_jobs.py` | `JOBS = WorkspaceClient().jobs.list()` | nothing (scope) |
| `dg-load-time-io` | `--tool edit --path C:/Users/jpollock/AppData/Local/Temp/dg-kb-smoke/src/orders/defs/jobs.py` | `JOBS = WorkspaceClient().jobs.list()` | triggered (absolute path) |

4. Scans: `omp ttsr scan C:/Users/jpollock/src/Databricks` and `omp ttsr scan C:/Users/jpollock/src/agent-sql-server/src` → no `dg-*` hits (other prefixes may appear).
5. Reads: `omp read skill://dagster` shows `# Dagster KB`; `omp read skill://dagster/<file>` shows `# Projects, definitions, and the dg CLI`, `# Assets and lineage`, `# Resources, configuration, and environments`, `# Automation, partitions, and concurrency`, `# Testing and asset checks`, `# Deploying and operating Dagster`, `# Orchestrating Databricks from Dagster`, `# Dagster KB sources` for `project.md`, `assets.md`, `resources.md`, `automation.md`, `testing.md`, `deploy.md`, `databricks.md`, `sources.md`; `omp read skill://dagster-expert` shows `## Core Dagster Concepts`; `omp read skill://dagster-expert/references/cli/check.md` returns non-empty content.
6. Vendored integrity: write this to `C:/Users/jpollock/AppData/Local/Temp/dagster-skills-vendor/compare.ts` and run `bun run C:/Users/jpollock/AppData/Local/Temp/dagster-skills-vendor/compare.ts C:/Users/jpollock/AppData/Local/Temp/dagster-skills-vendor/skills-97d54a45e5f55ca738de4e90937857c1b93168f5/plugins/dagster/skills/dagster-expert C:/Users/jpollock/.omp/agent/skills/dagster-expert` → exactly three lines: `only-installed LICENSE`, `differs SKILL.md`, `upstream=173 installed=174`. Then `wc -l` on both `SKILL.md` files → installed = upstream + 1, and installed lines 1–3 are `---`, `name: dagster-expert`, `hide: true`.
```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const [upstream, installed] = process.argv.slice(2);
const walk = (root: string, dir: string = root): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(root, path) : [relative(root, path).replaceAll("\\", "/")];
  });
const left = new Set(walk(upstream));
const right = new Set(walk(installed));
for (const file of [...new Set([...left, ...right])].sort()) {
  if (!left.has(file)) console.log(`only-installed ${file}`);
  else if (!right.has(file)) console.log(`only-upstream ${file}`);
  else if (!readFileSync(join(upstream, file)).equals(readFileSync(join(installed, file)))) console.log(`differs ${file}`);
}
console.log(`upstream=${left.size} installed=${right.size}`);
```
7. Router: `rules/domain-router.md` has exactly one line starting `| dagster |`, byte-identical to Step 1A (or the Step 1B row); every other line equals the copy read immediately before the edit. Step 1B only: its `bun build` check exits 0.
8. Tags: write this to `C:/Users/jpollock/AppData/Local/Temp/dagster-skills-vendor/tags.ts` and `bun run` it → last line `bad=0`.
```ts
import { existsSync, readFileSync } from "node:fs";

const kb = "C:/Users/jpollock/.omp/agent/skills/dagster";
const vendored = "C:/Users/jpollock/.omp/agent/skills/dagster-expert";
const files = ["SKILL.md", "project.md", "assets.md", "resources.md", "automation.md", "testing.md", "deploy.md", "databricks.md"];
const prefixes: Record<string, (path: string) => string> = {
  DG: (path) => `https://docs.dagster.io/${path}`,
  BLOG: (path) => `https://dagster.io/blog/${path}`,
  GH: (path) => `https://github.com/dagster-io/dagster/blob/master/${path}`,
  PYPI: (path) => `https://pypi.org/project/${path}/`,
  DBSDK: (path) => `https://databricks-sdk-py.readthedocs.io/en/latest/${path}.html`,
};
const tags = new Set<string>();
for (const file of files) {
  for (const match of readFileSync(`${kb}/${file}`, "utf8").matchAll(/\[([A-Z][^\]]*)\]\s*$/gm)) {
    for (const tag of match[1].split(", ")) if (tag !== "U") tags.add(tag);
  }
}
let bad = 0;
for (const tag of [...tags].sort()) {
  const [kind, ...rest] = tag.split(":");
  const path = rest.join(":");
  if (kind === "SK") {
    if (!existsSync(`${vendored}/${path}`)) { bad += 1; console.log(`missing ${tag}`); }
    continue;
  }
  const toUrl = prefixes[kind];
  if (!toUrl) { bad += 1; console.log(`unknown ${tag}`); continue; }
  const response = await fetch(toUrl(path), { redirect: "follow" });
  if (response.status !== 200) { bad += 1; console.log(`${response.status} ${tag}`); }
}
console.log(`tags=${tags.size} bad=${bad}`);
```
9. Headless router E2E: `mkdir -p C:/Users/jpollock/AppData/Local/Temp/dg-kb-smoke`; in that cwd run `omp -p --no-session --mode json "Create src/orders_pipeline/defs/orders.py for a Dagster project: a daily-partitioned asset orders_daily (partitions from 2026-01-01) that runs the bundle-deployed Databricks job named orders_refresh with job parameter run_date set to the partition key, through a Databricks resource whose host comes from the DATABRICKS_HOST environment variable. Do not install packages, run dg, or connect to Databricks or Dagster."` → in the output a read of `skill://dagster` precedes the first write of that file and `skill://dagster/databricks.md` is read; the files written under `src/` contain `DailyPartitionsDefinition(start_date="2026-01-01"`, `jobs.list(name=`, `run_now`, `EnvVar("DATABRICKS_HOST")`, `partition_key`, and none of `new_cluster`, `SubmitTask`, `jobs.submit`, `os.getenv`.
10. Live TTSR E2E, in `dg-kb-smoke`: `omp -p --no-session --mode json "Create src/legacy_fixture/defs/legacy.py as a byte-exact lint fixture containing exactly this one line: from dagster import AutoMaterializePolicy  Do not modernize it."` → output contains `rule_violation` and `dg-legacy-apis`.
11. Subagent reach: `omp -p --no-session "Spawn exactly one task subagent whose task is: reply with only the read URL your domain router lists for the dagster domain. Print its reply verbatim."` → prints `skill://dagster`.
12. Hidden: `omp -p --no-session "Reply with the comma-separated names in your available skills list, or none."` → the reply contains neither `dagster` nor `dagster-expert`.
13. Durability: case-insensitive search of the 9 `skills/dagster/` files and the five rule files for `~/src|C:/|\.tfvars|\.tf:\d|\.py:\d|\.ya?ml:\d|not cloned|not under|not configured` → no matches.

## Assumptions & contingencies
- Vendored content pinned to `97d54a45e5f55ca738de4e90937857c1b93168f5` (Dagster 1.13.24). Re-vendor = re-run Step 2 with a new SHA, then update the SHA, date, and file count in `sources.md` (legend, Snapshot) and Verification 6.
- If the tarball download fails, write a throwaway `bun` script that reads `https://api.github.com/repos/dagster-io/skills/git/trees/97d54a45e5f55ca738de4e90937857c1b93168f5?recursive=1`, keeps `blob` paths under `plugins/dagster/skills/dagster-expert/` plus `LICENSE`, and downloads each from `https://raw.githubusercontent.com/dagster-io/skills/97d54a45e5f55ca738de4e90937857c1b93168f5/<path>` into the same relative layout under the upstream root of Step 2.1; continue from Step 2.2.
- If Step 2.2 counts other than 173 files, the tarball is authoritative: use the observed count in `sources.md` Snapshot (`173 upstream files`) and Verification 6 (`upstream=<n> installed=<n+1>`).
- If Verification 3 shows `*.py` not matching the nested path, change `dg-legacy-apis` scope to `"tool:edit(**/*.py), tool:write(**/*.py)"` and re-run 2–3. If root `definitions.py` doesn't match `**/definitions.py`, append `, tool:edit(definitions.py), tool:write(definitions.py)` to the scopes of `dg-envvar-secrets`, `dg-env-literals`, `dg-databricks-bundle-owned`, `dg-load-time-io` and re-run.
- OSS environment variable `ENVIRONMENT` (`dev`|`tst`|`prd`) mirrors the Astro platform convention; to use another name, edit the resources.md Environments bullet and the `dg-env-literals` table.
- Databricks default path = SDK trigger of bundle jobs by name; approving `DatabricksWorkspaceComponent` later means editing the databricks.md Ownership bullet and the `dg-databricks-bundle-owned` table.
- Verification 9, 11, or 12 failing (no `skill://dagster` read before the write, router unreachable from subagents, or a listed skill) → report it; no workaround.
