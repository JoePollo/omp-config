# dbt KB sources

Verified 2026-10-02 against dbt licensing and Core guides, dbt-snowflake Iceberg documentation, the house Dagster dbt component reference, the Snowflake KB, and user requirements. Re-verify on dbt Core/OSS, dbt-snowflake, Snowflake Iceberg, or Dagster integration upgrades.

| tag | source |
|---|---|
| `LIC` | [dbt licensing](https://docs.getdbt.com/docs/dbt-licensing.md?version=2.0) — v1/v2 distribution and license split |
| `V1` | [v1.0 upgrade guide](https://docs.getdbt.com/docs/dbt-versions/dbt-upgrade/Older%20versions/upgrading-to-v1.0) — adapter package naming; [v1.latest source branch](https://github.com/dbt-labs/dbt/tree/1.latest) |
| `OSS2` | [Install dbt OSS](https://docs.getdbt.com/docs/local/install-dbt-v2) — Apache-licensed Rust runtime and `dbt-oss`; [dbt source repository](https://github.com/dbt-labs/dbt) |
| `STRUCTURE` | [How we structure our dbt projects](https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview) |
| `WORKFLOW` | [Best practices for workflows](https://docs.getdbt.com/best-practices/best-practice-workflows) — use Core CLI/state/defer guidance only |
| `MATERIALIZATIONS` | [Materializations best practices](https://docs.getdbt.com/best-practices/materializations/1-guide-overview) |
| `STYLE` | [How we style our dbt projects](https://docs.getdbt.com/best-practices/how-we-style/0-how-we-style-our-dbt-projects) — clarity and consistency principles only |
| `SOURCES` | [Sources](https://docs.getdbt.com/docs/build/sources) |
| `TESTS` | [Data tests](https://docs.getdbt.com/docs/build/data-tests) |
| `UNIT` | [Unit tests](https://docs.getdbt.com/docs/build/unit-tests) |
| `CONTRACT` | [Model contracts](https://docs.getdbt.com/docs/mesh/govern/model-contracts) — dbt Core capability, Mesh-filed docs |
| `INCREMENTAL` | [Incremental models](https://docs.getdbt.com/docs/build/incremental-models) |
| `SNAPSHOTS` | [Snapshots](https://docs.getdbt.com/docs/build/snapshots) |
| `PACKAGES` | [Packages](https://docs.getdbt.com/docs/build/packages) |
| `SFICEBERG` | [Snowflake Iceberg support for dbt](https://docs.getdbt.com/docs/build/iceberg/adapters/snowflake-iceberg-support.md) |
| `SFTABLE` | `skill://snowflake/tables.md` |
| `DGCOMPONENT` | `skill://dagster-expert/references/integrations/dagster-dbt/component-based-integration.md` |
| `DGSCaffold` | `skill://dagster-expert/references/integrations/dagster-dbt/scaffolding.md` |
| `DGPROJECT` | `skill://dagster/project.md` |
| `U` | `C:/Users/jpollock/.omp/agent/AGENTS.md` and the user's stated dbt/Snowflake/Dagster requirements and advisor notes |

## Snapshot

- dbt Core v1 is the Python, Apache-licensed runtime; use adapter-specific `dbt-<adapter>` packages. dbt OSS v2 is the Apache-licensed Rust runtime distributed as `dbt-oss`. The separate v2 `dbt` Product is proprietary and excluded. [LIC, V1, OSS2]
- The modeling target is Snowflake; persisted dbt table outputs default to Iceberg. Delta is an upstream external format/catalog input, not a Snowflake dbt materialization. [SFICEBERG, SFTABLE, U]
- Dagster integration uses `DbtProjectComponent`; the component reference owns detailed configuration. [DGCOMPONENT, U]

## Conflicts resolved

- The current `install-dbt` URL and its `?version=1` variant render v2 Product documentation; do not cite them as a v1 install source. Use the v1.0 upgrade guide only for the `dbt-<adapter>` package distinction. [V1, LIC]
- v2 Apache status applies to `dbt-oss`, not the default `dbt` v2 Product. [LIC, OSS2]
- The `/best-practices` index omits live guides; include the direct materializations and style pages. The style page is philosophy only, not SQL formatting rules. [MATERIALIZATIONS, STYLE]
- Core slim CI guidance is in best-practice workflows; exclude `/docs/deploy/ci-jobs` and other hosted-platform procedures. [WORKFLOW, LIC]
- Model contracts are Core behavior despite their Mesh documentation path; use `/docs/mesh/govern/model-contracts`, not `/docs/build/model-contracts`. [CONTRACT]
- Use the component-based Dagster reference; do not use the deprecated API page or Pythonic decorator as the house-standard path. [DGCOMPONENT, U]
- Do not use the 2019 Discourse/Jaffle demo links as authority, import Databricks silver-modeling conventions, or treat Delta as a Snowflake output format. [STRUCTURE, SFTABLE, U]
