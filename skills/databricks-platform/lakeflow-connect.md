# Lakeflow Connect
Tags → skill://databricks-platform/sources.md. House implementation (config-driven raw layer): skill://databricks-platform/data-platform-bundle.md §Raw. [DP:CONTRIBUTING.md]

## Choose
- Managed connectors (database, SaaS, file, query-based, streaming) ingest into UC streaming tables through serverless Lakeflow pipelines; standard connectors (Auto Loader, `COPY INTO`, Kafka) when you need more control or no managed connector fits. [LC]
- Source exposes change tracking or CDC → database connector; only a monotonically increasing timestamp/integer cursor column → query-based connector (latest row state per run, no intermediate states). [LC:query-based-overview]
- SQL Server standard CDC = continuous ingestion gateway + scheduled ingestion pipeline; integrated CDC = one pipeline that extracts inside each update, no always-on gateway. [LC:sql-server-overview, LC:sql-server-integrated-pipeline]
- Deploy ingestion pipelines with bundles; database connections are created programmatically (API, `databricks connections create --json`); here Databricks-IaC owns them. [LC, U]

## SQL Server source
- Change tracking for tables with a primary key (lowest source load); CDC for tables without one or when every operation must be captured; both enabled → the connector uses change tracking. [LC:sql-server-source-setup, LC:sql-server-concepts]
- Versions: change tracking SQL Server 2012+; CDC 2012 SP1 CU3+, Enterprise Edition before 2016. [LC:sql-server-source-setup]
- Connect to the primary instance; change tracking and CDC don't work on read replicas or secondaries. [LC:sql-server-pipeline]
- Dedicated ingestion user with only its deployment variation's privileges; SQL Server 2022+: `VIEW DATABASE PERFORMANCE STATE`, not `VIEW DATABASE STATE`. [LC:sql-server-privileges]
- Utility objects script (v1.5), installed by a `db_owner` user (the ingestion user needs no `db_owner`): `EXEC dbo.lakeflowSetupChangeTracking @Tables, @User, @Retention`; `EXEC dbo.lakeflowSetupChangeDataCapture @Tables, @User`; `EXEC dbo.lakeflowFixPermissions @User, @Tables`; `@Tables` = `'ALL'`, `'SCHEMAS:Sales,HR'`, `'Sales.Orders,HR.Employees'`, or `NULL` (database-level only). [LC:sql-server-utility, LC:sql-server-utility-reference]
- Upgrading the script: stop the gateway, re-run the script, then re-run the original change tracking/CDC setup procedure. [LC:sql-server-utility]
- CDC: SQL Server allows 2 capture instances per table; keep one free for Lakeflow (`lakeflow_<schema>_<table>_<n>`, formerly `New_<schema>_<table>_<n>`). [LC:sql-server-utility]
- Change tracking retention (script default `2 DAYS`) must outlast ingestion intervals and outages; changes purged before ingestion → full refresh. [LC:sql-server-utility-reference, LC:sql-server-pipeline]

## Gateway + ingestion pipeline (standard CDC)
- Gateway: classic compute, runs continuously, never stop it manually (log truncation drops changes → full refresh); billed even while the ingestion pipeline idles; driver ≥ 8 cores, smallest practical workers; undersized compute fails the initial snapshot. [LC:sql-server-pipeline, LC:cdc-overview]
- Staging: place the volume with `gateway_storage_catalog` / `gateway_storage_schema`, never in a foreign catalog; staged data is purged after 30 days. [LC:sql-server-pipeline, LC:cdc-overview]
- Ingestion pipeline: serverless, triggered on a schedule matching freshness needs (continuous unsupported); channel `CURRENT` (`PREVIEW` only for early access). [LC:sql-server-pipeline]
- Objects: schema-level spec ingests every table and picks up new ones; table-level spec for per-table destination names and settings; ≤ 250 tables per pipeline; never two same-named source tables in one pipeline, even from different schemas; unique destination names per schema. [LC:sql-server-pipeline, LC:sql-server-limits, LC:common-patterns]
- History: `scd_type: SCD_TYPE_2` only for tables on CDC; change tracking can't produce SCD type 2. [LC:sql-server-pipeline]
- Grant the pipeline identity privileges on the event-log, staging, and destination catalogs/schemas. [LC:sql-server-pipeline]

## Integrated CDC
- `connector_type: CDC` + `connection_name` (the UC connection); `data_staging_options` to stage elsewhere, otherwise a staging volume is created in the destination schema; ≤ 300 tables. [LC:sql-server-integrated-pipeline]
- Enable the workspace feature first; create via API, CLI, notebook, or bundle (no UI); `connection_name` and `connector_type` are immutable → new pipeline to change the source. [LC:sql-server-integrated-pipeline]
- Schedule from a Lakeflow Jobs task at ≥ 60-minute intervals to start (each extraction stage runs ≥ 10 minutes); continuous mode is Beta. [LC:sql-server-integrated-pipeline]

## Schema evolution & full refresh
- New source columns ingest automatically; dropped source columns stay as inactive destination columns; renames and data type changes need a full refresh. [LC:sql-server-limits, LC:sql-server-overview]
- `auto_full_refresh_policy` (off by default; `min_interval_hours` 24) recovers from truncates, incompatible type changes, renames, and defaulted column additions; a full refresh erases SCD type 2 history. [LC:full-refresh, LC:sql-server-pipeline]
- Pattern support (SCD type 2, column selection, row filtering, destination rename, multi-destination) varies by connector: check its feature table first (SQL Server: no API row filtering). [LC:common-patterns, LC:sql-server-overview]

## Monitor & cost
- Cost: `system.billing.usage` where `billing_origin_product = 'LAKEFLOW_CONNECT'`; per pipeline via `usage_metadata.dlt_pipeline_id` joined to `system.lakeflow.pipelines.pipeline_id`; price via `system.billing.list_prices`. [LC:monitor-costs]
- Gateway: `event_log('<gateway-pipeline-id>')` rows with `event_type` `flow_progress` / `operation_progress`, `level = 'METRICS'`, `origin.pipeline_type = 'INGESTION_GATEWAY'`; row and byte metrics are deltas (sum them); snapshot `progress_percent`, `estimated_completion_ms`; CDC `discovery_latency_ms`. [LC:gateway-event-logs]
- Failures retry with backoff; expired credentials need a fix, then the connector resumes from its stored cursor. [LC]

## Auto Loader (files)
- Scheduled `Trigger.AvailableNow` unless latency demands continuous; continuous → file events (enabled on the external location). [AL, UC:best-practices]
- File events: run every stream at least once per 7 days (else a full directory listing); never set `cloudFiles.backfillInterval` (backfills run about every 24 h). Classic notification mode: `cloudFiles.backfillInterval` for completeness SLAs. [AL]
- Checkpoints outside cloud lifecycle policies; `cloudFiles.maxFileAge` conservative (minimum 14 days; e.g. 90). [AL]
- `cloudFiles.cleanSource` (DBR 16.4 LTS+) moves or deletes processed files: `MOVE` within the same external location or volume; `DELETE` only with storage versioning. [AL]
- Batch size: 1000 files per micro-batch by default; `cloudFiles.maxFilesPerTrigger` is hard, `cloudFiles.maxBytesPerTrigger` soft. [AL]
- Landing zones: external volumes (data copied onward); external tables only to query in place. [UC:best-practices]
