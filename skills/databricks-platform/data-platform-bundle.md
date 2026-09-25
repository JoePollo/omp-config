# data_platform bundle (house SDP framework)
Tags → skill://databricks-platform/sources.md. Path `~/src/Databricks/bundles/data_platform` (actively developed). `CONTRIBUTING.md` is the authoritative config contract; inside this bundle it and the existing code win over the generic topics. [DBX:README.md, DP:CONTRIBUTING.md]

## Shape
- Declarative Automation Bundle `data_platform`: `include: resources/*.yml` (dashboard, alerts); Python resources `resources:load_resources` in `resources/__init__.py` build every pipeline and job from `src/data_platform/config/<layer>/*.yaml`; wheel built with `uv build --wheel`. [DP:databricks.yml, DP:resources/__init__.py]
- Layers: `raw` (Lakeflow Connect ingestion), `bronze` (SCD2 history), `silver` (curated SCD1 + quarantine), `legacy_bronze` (SCD1 hydration of legacy stage tables), `egress` (Delta CDF → SQL Server jobs). [DP:README.md, DP:resources/__init__.py]
- One generic SDP module per layer (`src/data_platform/pipelines/<layer>/<layer>.py`) serves every configured table; each pipeline selects its entry through configuration key `pipeline_name` (bronze: `pipelines.source_system`, `pipelines.table_name`, `bundle.catalog`; Salesforce bronze: `bronze.group`). [DP:src/data_platform/pipelines/silver/silver.py, DP:resources/__init__.py]
- Change a table = change YAML (silver: plus its SQL file); never add per-table pipeline code or resources. New raw connector or mode = Pydantic model under `models/raw/` + `CONNECTOR_FAMILIES` + `RAW_RESOURCE_BUILDERS` entry. [DP:resources/__init__.py, DP:src/data_platform/models/raw/__init__.py]

## Config contract
- Strict Pydantic loaders reject unknown keys at every level; YAML aliases only `connector.type`, `connector.mode`, and `schema` (Python field `db_schema` is never a YAML key); no compatibility aliases or flattened records. [DP:CONTRIBUTING.md]
- YAML is comment-free: record non-obvious source facts in `CONTRIBUTING.md`; preserve file, mapping, and list order; omit default blocks unless a non-default value is needed. [DP:CONTRIBUTING.md]
- A raw `destination.table` equals its bronze `source.table` exactly. [DP:CONTRIBUTING.md]
- Names are lowercase snake_case; `identity.source_name` matches `^[a-z][a-z0-9_]*$`; `identity.ingestion_name` defaults to it and drives resource names. [DP:src/data_platform/models/raw/base.py]

## Raw (Lakeflow Connect)
- File `config/raw/<source_type>/<ingestion_mode>/<source>.yaml` (Salesforce: `config/raw/salesforce/`); `connector.type: sqlserver` with `connector.mode` `cdc`, `query_based`, or `multidatabase_query`; Salesforce mode is implicitly `managed`. [DP:CONTRIBUTING.md, DP:src/tests/raw/test_raw_layout.py]
- `connection.name` references a UC connection that Databricks-IaC provisions out of band. [DP:CONTRIBUTING.md]
- `cdc`: `source.catalog`, `ingestion.gateway.storage_schema`, ordered `ingestion.tables` (source `schema`/`table`, optional `exclude_columns`, explicit `destination.table`, emitted lowercased) → `raw_<ingestion_name>_gateway` (continuous) + `raw_<ingestion_name>` (serverless, triggered externally). [DP:src/data_platform/models/raw/connectors/sqlserver.py, DP:resources/__init__.py]
- A UC connection's CDC gateway grant allows one gateway per environment and source: only canonical `dev`/`tst`/`prd` deploy raw; `dev-local` sets `deploy_raw: false`. [DP:databricks.yml]
- `query_based` (one database, `source.catalog`) / `multidatabase_query` (ordered `database_groups`): nonempty `primary_keys`; `cursor_columns` → incremental (required for multidatabase; omitted single-database = batch snapshot); ≤ 250 tables per pipeline or group; `ingestion.runtime.serverless` defaults `false` → classic cluster on `${var.raw_query_pool_id}`. [DP:CONTRIBUTING.md, DP:src/data_platform/models/raw/connectors/sqlserver.py]
- Salesforce: `ingestion.objects` (`object`, `primary_keys`, optional `include_columns`, `reconciliation.audit_columns`) → `raw_<ingestion_name>` + `raw_<ingestion_name>_reconcile`. [DP:src/data_platform/models/raw/connectors/salesforce.py, DP:resources/__init__.py]

## Bronze
- `config/bronze/<source>.yaml`: `source.schema` + ordered `tables` of `source.table`, `target.table`, nonempty `cdc.keys` (Salesforce: `groups[].name` + `tables`); one serverless pipeline per target (Salesforce: `salesforce_bronze_<group>`). [DP:src/data_platform/models/bronze_config.py, DP:resources/__init__.py]
- Runtime: materialized view `_snapshot_<table>` → streaming table (`cluster_by_auto=True`) via `dp.create_auto_cdc_from_snapshot_flow(..., stored_as_scd_type=2)`. [DP:src/data_platform/pipelines/bronze/bronze.py]

## Silver (current models)
- Current silver pipelines replicate legacy models (`legacy_*` names, `snapshot_legacy_*.sql`, tag `pattern: legacy`); new-silver Data Vault design belongs to the silver modeling KB. [DP:resources/__init__.py]
- `config/silver/<source>.yaml` `pipelines`: unique lowercase snake_case `name`, nonempty `cdc.keys`, `target.table_properties` with `delta.enableChangeDataFeed: "true"`, optional `quality`; plus `src/data_platform/transforms/silver/sql/snapshot_<name>.sql` (header documenting sources, target, keys; CTEs over `bronze.*`; full current snapshot). [DP:CONTRIBUTING.md, DP:src/tests/silver/test_silver_config.py]
- Quality: `quality.column_types` (casts → generated `<column>_is_<type>` `TRY_CAST` rules) and named SQL booleans in `quality.expectations` (an explicit rule overrides the same-named generated one). [DP:CONTRIBUTING.md, DP:src/data_platform/models/silver_config.py]
- Runtime: `_<name>_snapshot_all` (`@dp.table`, `partition_cols=["is_quarantined"]`, `@dp.expect_all` for metrics) → `@dp.view` `_<name>_snapshot_valid` (casts applied) / `_<name>_snapshot_quarantine` (keeps `_quarantine_reason`) → `<name>` SCD1, `<name>_quarantine` SCD1, `<name>_quarantine_history` SCD2, all `cluster_by_auto=True`. [DP:src/data_platform/pipelines/silver/silver.py]

## Legacy bronze
- `config/legacy_bronze/<source>.yaml` `pipelines`: `name`, `source.table`, `cdc.keys`, optional `source.cdc_date_column` and `cdc.delete_mode` (`preserve` default, `physical`), required CDF `target.table_properties`; `mode: composition` needs its typed `composition` block. [DP:CONTRIBUTING.md, DP:src/data_platform/models/legacy_bronze_config.py]
- Runtime: generic `build_legacy_bronze_snapshot` over bronze SCD2 → SCD1 target; no expectations or quarantine; metadata `CDC_Date`, `CDC_Version`, `CDC_MD5`, `Is_Deleted`, `ETL_Date`. [DP:src/data_platform/transforms/legacy_bronze/snapshot.py, DP:src/tests/legacy_bronze/test_legacy_bronze_generic.py]

## Egress (Delta CDF → SQL Server)
- `config/egress/<source>.yaml`: named `sources` and `targets` (`connection.secret_key` resolved from `${catalog}.config`; `staging_schema` default `dbo`), ordered `tables` with nonempty `write.keys` (`mode` `merge` default or `full_replace`, `chunk_size` 200000, `reconcile_snapshot_deletes` false); explicit `target.columns` include every key. [DP:CONTRIBUTING.md, DP:src/data_platform/models/egress_config.py]
- One job `egress_<source_table>` per table on classic `_EGRESS_CLUSTER` (`17.3.x-scala2.13`, `${var.egress_pool_id}`, `USER_ISOLATION`); `merge` tables read `readChangeFeed` from `last_committed_version + 1` in `audit.egress_checkpoints`, stage, then `MERGE` into SQL Server (sources need CDF); `full_replace` tables reload a snapshot (truncate + insert). [DP:resources/__init__.py, DP:src/data_platform/egress/run.py, DP:src/data_platform/egress/apply.py, DP:src/data_platform/config/egress/onbase.yaml]
- Errors: initial-snapshot recovery only for `DELTA_MISSING_CHANGE_DATA` and checkpoint divergence; every other `AnalysisException` re-raises; checkpoint read or schema failures abort before target writes. [DP:src/data_platform/egress/run.py, DP:src/tests/egress/test_egress_run.py]

## Generated settings
- Output pipelines: `serverless: true`, catalog `${var.source_catalog}`, schema `${var.bronze_schema}` / `${var.silver_schema}`, `root_path: ${workspace.file_path}/src`, event log `${var.event_log_name_prefix}<pipeline>_event_log` in `<catalog>.audit`, `pipelines.numUpdateRetryAttempts` and `pipelines.maxFlowRetryAttempts` "0"; no schedules in the bundle (triggered externally; the Astro service principal has `CAN_MANAGE`). [DP:resources/__init__.py, DP:databricks.yml]
- Targets: `dev-local` (development mode; per-user `${workspace.current_user.short_name}` schemas and event-log prefix; `deploy_raw` and `deploy_egress` false), `dev` and `tst` (default `pause_status: PAUSED`), `prd` (production mode, `pause_status: UNPAUSED`); all run as `${var.service_principal}`; catalogs `dwh_<env>`. [DP:databricks.yml]
- Audit and monitoring: `<catalog>.audit.process_audit_log` (service `SDP`); opt-in hourly materialized view `<catalog>.audit.quarantine_summary`; alert `silver_quarantine_summary` (daily 08:00 America/Chicago) and dashboard `silver_quarantine_monitor`. [DP:src/data_platform/audit/log.py, DP:src/data_platform/quarantine_monitor/view.py, DP:resources/quarantine_alerts.yml]

## Workflow
- From `bundles/data_platform` with Python 3.12: `uv sync`, `uvx ruff format .`, `uvx ruff check .` (120 columns, McCabe 5), `uvx ty check`, `uv run pytest src/tests/ -q`, `databricks bundle validate --target dev-local`. [DP:CONTRIBUTING.md, DP:pyproject.toml]
- Local validation never deploys, runs pipelines or jobs, connects to SQL Server, truncates targets, or egresses data. [DP:CONTRIBUTING.md]
- Deploy through Azure DevOps `.azure-pipelines/bundle-deploy.yml` (validate → plan → manual approval → deploy, one bundle and environment at a time); `.azure-pipelines/bundle-pr-validate.yml` validates against `dev` only. [DBX:README.md]
- Known drift, never copy: `pipelines/bronze/bronze.py` falls back to `dwh_dev` for the `epicor_union` source when `bundle.catalog` is unset; the quarantine dashboard JSON queries `dwh_dev.audit.quarantine_summary`; three config files carry comments; `docs/egress/deployment.md` prescribes manual UC `GRANT`s on schemas Databricks-IaC manages. [DP:src/data_platform/pipelines/bronze/bronze.py, DP:resources/dashboards/silver_quarantine_monitor.lvdash.json, DBX:docs/egress/deployment.md, U]
