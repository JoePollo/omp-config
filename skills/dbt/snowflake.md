# dbt models on Snowflake

Tags → skill://dbt/sources.md.

## Open table formats

- Default persisted dbt table outputs to Apache Iceberg with `dbt-snowflake` `table_format='iceberg'`; views and ephemeral models have no persisted table format. [SFICEBERG, U]
- The adapter documents Iceberg support for table, incremental, and dynamic-table materializations; use generic view/table/incremental decision guidance, not dynamic tables as the default model pattern. [SFICEBERG, MATERIALIZATIONS]
- Use `catalogs.yml` for supported external Iceberg catalogs when required; the adapter documents Snowflake Horizon and external REST catalogs such as Polaris, Snowflake Open Catalog, AWS Glue, and Unity. [SFICEBERG]
- Treat Delta and Parquet as upstream external data formats, not dbt-snowflake output table formats; Snowflake's external tables are read-only, and its table guidance prefers Iceberg for Parquet/Delta external files. [SFTABLE, SFICEBERG]
- Distinguish Parquet file format from Iceberg table format; cross-engine access also depends on catalog, storage, credentials, and reader/writer support. [SFICEBERG, SFTABLE]

## Ownership

- Confirm `dbt-snowflake` support against the selected dbt Core v1 or dbt OSS v2 runtime; do not assume the same adapter release or configuration works across both. [LIC, V1, OSS2, SFICEBERG]
- Defer Snowflake DDL, storage, catalog permissions, Iceberg lifecycle, and external-table semantics to `skill://snowflake/tables.md`. [SFTABLE]
- Keep Snowflake dynamic-table refresh settings out of the generic dbt model pattern and defer them to the Snowflake KB. [SFTABLE, U]
