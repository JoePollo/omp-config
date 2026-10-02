# Dagster KB sources

Verified 2026-09-25 against docs.dagster.io (latest 1.13.24), Dagster blog posts, the vendored skill://dagster-expert (dagster-io/skills @ `97d54a45e5f55ca738de4e90937857c1b93168f5`), Dagster `MIGRATION.md`, PyPI, and the Databricks SDK for Python docs. Re-verify on every Dagster minor (next: 1.14) and whenever skill://dagster-expert is re-vendored.

| tag | source |
|---|---|
| `DG:<p>` | <https://docs.dagster.io/><p> (API reference under `DG:api/…`) |
| `BLOG:<slug>` | <https://dagster.io/blog/><slug> |
| `SK:<p>` | skill://dagster-expert/<p> (upstream <https://github.com/dagster-io/skills/blob/97d54a45e5f55ca738de4e90937857c1b93168f5/plugins/dagster/skills/dagster-expert/><p>) |
| `GH:<p>` | <https://github.com/dagster-io/dagster/blob/master/><p> |
| `PYPI:<pkg>` | <https://pypi.org/project/><pkg>/ |
| `DBSDK:<p>` | <https://databricks-sdk-py.readthedocs.io/en/latest/><p>.html |
| `U` | user decisions and environment: AGENTS.md (dev/tst/prd, read-only external systems, uv), Databricks `data_platform` bundle ownership and platform facts, Azure DevOps CI (observed 2026-09-25); Dagster is self-hosted on AWS, with Dagster mode and AWS services unspecified (user-provided 2026-10-02) |

## Snapshot

- Versions (PyPI, 2026-09-21): `dagster`, `dagster-dg-cli`, `create-dagster`, `dagster-webserver`, `dagster-cloud`, `dagster-pipes` 1.13.24; `dagster-postgres`, `dagster-k8s`, `dagster-databricks`, `dagster-azure`, `dagster-msteams` 0.29.24; Python `>=3.10,<3.15` (3.9 dropped in 1.12.2).
- Releases about weekly; stable APIs follow semver within 1.x; preview may break in patches, beta in minors; libraries stay 0.y.z.
- Preview in 1.13.24: `DatabricksAssetBundleComponent`, `DatabricksWorkspaceComponent`, Azure resource components, virtual assets, partitioned asset checks, job-level automation conditions, freshness policies on OSS; the Dagster+ Terraform provider is early-access preview.
- Removed in 1.13.0: `external_asset_from_spec`/`external_assets_from_specs`, single-`AssetKey` `deps`, `Definitions.get_all_asset_specs`, `legacy_freshness_policy` loader arguments; removed in 1.12.6: the `dagster project` CLI group.
- Prefect is acquiring Dagster Labs (announced 2026-07-13); Dagster keeps its name and open-source license, and Dagster+ stays supported.
- Vendored skill: `dagster-expert` from dagster-io/skills `release-stable` @ `97d54a45e5f55ca738de4e90937857c1b93168f5` (1.13.24, 2026-09-21), Apache-2.0 (`LICENSE` copied beside it); 174 upstream files; the only local change is `hide: true` in its `SKILL.md` frontmatter.

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
