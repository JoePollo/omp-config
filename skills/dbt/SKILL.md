---
name: dbt
description: dbt open-source knowledge base (dbt Core v1 Python and dbt OSS v2 Rust, Snowflake Iceberg models, Dagster orchestration). Routed by rule://domain-router.
hide: true
kb:
  roots: ['**/dbt_project.yml']
  content:
    - { files: '**/*.py', pattern: '(?:\b(?:dagster_dbt|DbtProjectComponent)\b|@dbt_assets\b)' }
    - { files: '**/*.{sql,yml,yaml}', pattern: '\b(?:dbt-snowflake|table_format|iceberg|catalogs\.yml)\b', flags: i }
    - { files: '**/*.sql', pattern: '\{\{\s*(?:ref|source)\s*\(' }
  commands:
    - '^(?:uv\s+run\s+)?dbt(?:\s|$)'
    - '^(?:uv\s+run\s+)?dg\s+scaffold\s+defs\s+dagster_dbt\.DbtProjectComponent\b'
  topics:
    - file: project.md
      files: ['**/dbt_project.yml', '**/models/**/*.sql', '**/models/**/*.yml', '**/models/**/*.yaml']
      content: [{ files: '**/*.sql', pattern: '\{\{\s*(?:ref|source)\s*\(' }]
      commands: ['^(?:uv\s+run\s+)?dbt\s+(?:init|debug|parse|compile)\b']
    - file: quality.md
      content: [{ files: '**/*.{sql,yml,yaml}', pattern: '\b(?:data_tests|unit_tests|snapshots|freshness|contract)\b', flags: i }]
      commands: ['^(?:uv\s+run\s+)?dbt\s+(?:test|build)\b']
    - file: snowflake.md
      content: [{ files: '**/*.{sql,yml,yaml}', pattern: '\b(?:dbt-snowflake|table_format|iceberg|catalogs\.yml|delta)\b', flags: i }]
    - file: dagster.md
      content: [{ files: '**/*.{py,yml,yaml}', pattern: '(?:\b(?:dagster_dbt|DbtProjectComponent)\b|@dbt_assets\b)' }]
      commands: ['^(?:uv\s+run\s+)?dg\s+scaffold\s+defs\s+dagster_dbt\.DbtProjectComponent\b']
    - file: workflows.md
      commands: ['^(?:uv\s+run\s+)?dbt\s+(?:build|run|test|source|parse|compile)\b']
      content: [{ files: '**/*.{yml,yaml}', pattern: '\b(?:state:modified|--defer|--state)\b' }]
---

# dbt KB

Defaults only: explicit instructions, AGENTS.md, repo config/conventions win. Read every topic whose trigger matches. Tags → skill://dbt/sources.md.

## Topics

| trigger | read |
|---|---|
| `dbt_project.yml`, project layout, `ref()`, `source()`, macros, materialization choice | skill://dbt/project.md |
| data tests, unit tests, source freshness, snapshots, model contracts | skill://dbt/quality.md |
| dbt-snowflake, Iceberg, `catalogs.yml`, external Parquet or Delta sources | skill://dbt/snowflake.md |
| Dagster dbt assets, `DbtProjectComponent`, `dagster_dbt` | skill://dbt/dagster.md |
| dbt CLI workflows, state selection, `--defer`, slim CI, dev/tst/prd targets | skill://dbt/workflows.md |

## Core

- Scope this pack to dbt Core v1 (Python) and dbt OSS v2 (Rust); keep versions, adapters, and artifacts distinct. [LIC, V1, OSS2]
- Install v1 with its adapter package (`dbt-<adapter>`); the Apache-licensed v2 distribution is `dbt-oss`, not the separate `dbt` v2 Product. [LIC, V1, OSS2]
- Exclude dbt Product and hosted-platform workflows; use only Core-compatible guidance from shared documentation. [LIC, U]
- Keep Snowflake table semantics in `skill://snowflake/tables.md` and Dagster component mechanics in `skill://dagster-expert/references/integrations/dagster-dbt/component-based-integration.md`. [SFTABLE, DGCOMPONENT]
