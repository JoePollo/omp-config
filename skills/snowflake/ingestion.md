# Loading and unloading

Tags → skill://snowflake/sources.md. Post-landing transforms (streams, tasks, dynamic tables) → skill://snowflake/pipelines.md.

## Method choice

| Method | Fit | Latency | Billing | Src |
|---|---|---|---|---|
| `COPY INTO <table>` | scheduled batch from staged files | per run | user warehouse time | [UG:data-load-overview] |
| Snowpipe `AUTO_INGEST = TRUE` | files landing in cloud storage | ~1 min after notification | 0.0037 credits/GB; text uncompressed, binary observed size | [UG:data-load-snowpipe-billing, REL:2025/other/2025-12-08-snowpipe-simplified-pricing] |
| Snowpipe Streaming (high-performance) | rows from apps, devices, CDC; no files | as low as 5 s | credits per uncompressed GB | [UG:snowpipe-streaming/data-load-snowpipe-streaming-overview, UG:snowpipe-streaming/snowpipe-streaming-high-performance-cost] |
| Snowflake Connector for Kafka v4 | Kafka Connect clusters | 5–10 s | Streaming per-GB rate | [UG:kafka-connector/index] |
| Openflow connector | SaaS, database CDC, unstructured sources | connector-dependent | SPCS compute pools + ingestion + telemetry | [UG:data-integration/openflow/cost-spcs] |

- Load a given file set with bulk COPY or Snowpipe, never both; load metadata is separate (table 64 days, pipe 14 days) and mixing duplicates rows. [UG:data-load-snowpipe-intro]
- Highly concurrent COPY into one table → migrate to Snowpipe. [UG:data-load-considerations-load]

## File preparation

- Target 100–250 MB compressed files; parallelism ≤ file count; avoid ≥ 100 GB files; loads over 24 h can abort with nothing committed. [UG:data-load-considerations-prepare]
- Snowpipe queue overhead scales with file count: aggregate small files, stage about once per minute. [UG:data-load-considerations-prepare, UG:data-load-snowpipe-intro]
- JSON: `STRIP_NULL_VALUES = TRUE` when null means missing; one type per element keeps subcolumnarization. [UG:data-load-considerations-prepare, UG:data-load-considerations-load]
- Reuse named `FILE FORMAT` objects in stages, COPY, and `INFER_SCHEMA` (named format required). [UG:data-load-s3-config-storage-integration, SQL:functions/infer_schema]
- Partition paths by source/date/hour and load the narrowest path; selectors fastest→slowest: `FILES` (≤ 1,000) > path > `PATTERN`; filter Snowpipe at the provider event source, not `PATTERN` (S3 prefix/suffix; Azure Event Grid `data.api`). [UG:data-load-considerations-stage, UG:data-load-considerations-load, UG:data-load-considerations-manage, UG:data-load-snowpipe-auto-s3, UG:data-load-snowpipe-auto-azure]

## Stages and integrations

- Use named internal stages (grantable); user `@~` and table `@%t` stages can't be granted or dropped. Internal encryption defaults to `SNOWFLAKE_FULL` and is fixed at create; use `SNOWFLAKE_SSE` only for pre-signed URLs (no Tri-Secret Secure). [UG:data-load-overview, SQL:sql/create-stage]
- AWS S3 (default for these AWS-hosted accounts): define a storage integration with `STORAGE_PROVIDER = 'S3'`, a scoped `STORAGE_AWS_ROLE_ARN`, and `STORAGE_ALLOWED_LOCATIONS`; configure AWS trust with `STORAGE_AWS_IAM_USER_ARN` and `STORAGE_AWS_EXTERNAL_ID` from `DESC INTEGRATION`; use `s3://` stage URLs. [UG:data-load-s3-config-storage-integration, UG:data-load-s3-create-stage]
- Azure external storage (when needed): `CREATE STORAGE INTEGRATION ... STORAGE_PROVIDER = 'AZURE' AZURE_TENANT_ID = ... STORAGE_ALLOWED_LOCATIONS = (...)` → `DESC STORAGE INTEGRATION` → open `AZURE_CONSENT_URL` → grant the `AZURE_MULTI_TENANT_APP_NAME` principal `Storage Blob Data Reader` (load) or `Contributor` (unload/REMOVE/PURGE). [UG:data-load-azure-config]
- Use `blob.core.windows.net` URLs, including for ADLS Gen2; service-principal consent can take 1 h or more; revoked access lingers up to 60 min (credential cache). [UG:data-load-azure-config]
- Never inline `CREDENTIALS`; use provider-specific storage integrations. `REQUIRE_STORAGE_INTEGRATION_FOR_STAGE_CREATION` and `..._OPERATION` (default FALSE) enforce integrations. [UG:data-load-s3-config-storage-integration, UG:data-load-azure-config, SQL:parameters]
- Azure external-stage private connectivity: `USE_PRIVATELINK_ENDPOINT = TRUE` plus `SYSTEM$PROVISION_PRIVATELINK_ENDPOINT` (Business Critical+; billed per endpoint and per GB). [UG:data-load-azure-private]
- Directory tables: `DIRECTORY = (ENABLE = TRUE AUTO_REFRESH = TRUE NOTIFICATION_INTEGRATION = '<ni>')`, billed as Snowpipe; `CREATE OR REPLACE STAGE` empties the directory and unlinks external tables. [UG:data-load-dirtables, SQL:sql/create-stage]

## Snowpipe on AWS

- `CREATE PIPE ... AUTO_INGEST = TRUE` consumes S3 ObjectCreate notifications through a Snowflake-managed SQS queue; configure the bucket event notification to target the queue ARN from `SHOW PIPES`. [UG:data-load-snowpipe-auto-s3]
- Filter S3 notifications by object prefix/suffix; use SNS fan-out when an existing bucket notification conflicts; do not configure overlapping notification prefixes. [UG:data-load-snowpipe-auto-s3]
- Pipe error notifications use `ERROR_INTEGRATION` with an AWS SNS notification integration and `ON_ERROR = SKIP_FILE`; delivery is at-least-once. [UG:data-load-snowpipe-errors, UG:data-load-snowpipe-errors-sns, UG:notifications/creating-notification-integration-amazon-sns]

## Snowpipe on Azure (for Azure Blob Storage)

- Chain: Event Grid subscription (Event Grid schema) → Storage Queue → `CREATE NOTIFICATION INTEGRATION ... TYPE = QUEUE NOTIFICATION_PROVIDER = AZURE_STORAGE_QUEUE` → consent → `Storage Queue Data Contributor` → `CREATE PIPE ... AUTO_INGEST = TRUE INTEGRATION = '<UPPERCASE>'`. [UG:data-load-snowpipe-auto-azure]
- Filter `data.api` to `CopyBlob PutBlob PutBlockList FlushWithClose SftpCommit`; renames don't trigger; one queue per integration; never overlap pipe paths. [UG:data-load-snowpipe-auto-azure]

## Pipe operation

- Pipes default to `ON_ERROR = SKIP_FILE`, don't guarantee file order, and can't `PURGE`; clean up with `REMOVE` or storage lifecycle rules. [SQL:sql/copy-into-table, UG:data-load-snowpipe-intro, UG:data-load-snowpipe-manage]
- `ALTER PIPE ... REFRESH [PREFIX = ...] [MODIFIED_AFTER = ...]` covers files staged in the last 7 days; repair only, not scheduling. [SQL:sql/alter-pipe]
- Change a pipe: pause with `PIPE_EXECUTION_PAUSED = TRUE`, check `SYSTEM$PIPE_STATUS` shows `PAUSED` with `pendingFileCount` 0, `CREATE OR REPLACE PIPE` (drops load history), resume. [UG:data-load-snowpipe-manage]
- A pipe paused > 14 days is stale; resume with `SYSTEM$PIPE_FORCE_RESUME(..., 'staleness_check_override')`; alert via `ERROR_INTEGRATION`. [UG:data-load-snowpipe-manage, UG:data-load-snowpipe-errors]

## COPY options

- `ON_ERROR` defaults: `ABORT_STATEMENT` for COPY, `SKIP_FILE` for pipes (buffers whole files); use `CONTINUE` only with an error check. [SQL:sql/copy-into-table]
- Pre-check with `VALIDATION_MODE = RETURN_ERRORS | RETURN_ALL_ERRORS | RETURN_<n>_ROWS` (not with transforms, `MATCH_BY_COLUMN_NAME`, or Iceberg); post-check with `VALIDATE(t, JOB_ID => '<id>' | '_last')` (empty under ABORT_STATEMENT). [SQL:sql/copy-into-table, SQL:functions/validate]
- `MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE` (default `NONE`) can't combine with COPY transforms; `INCLUDE_METADATA = (col = METADATA$FILENAME)` requires it. [SQL:sql/copy-into-table]
- Bootstrap: `CREATE TABLE ... USING TEMPLATE (SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*)) FROM TABLE(INFER_SCHEMA(LOCATION => '@stg/p/', FILE_FORMAT => 'fmt')))`; no table stages; CSV needs `PARSE_HEADER = TRUE`. [SQL:functions/infer_schema]
- `ENABLE_SCHEMA_EVOLUTION = TRUE` needs `MATCH_BY_COLUMN_NAME` plus EVOLVE SCHEMA or OWNERSHIP; ≤ 100 new columns per COPY; not via INSERT or tasks. [UG:data-load-schema-evolution]
- Files with expired (64-day) metadata are skipped: `LOAD_UNCERTAIN_FILES = TRUE` still dedupes where metadata exists; `FORCE = TRUE` reloads (duplicates). [UG:data-load-considerations-load, SQL:sql/copy-into-table]
- `PURGE = TRUE` fails silently; delete files only after COPY_HISTORY shows `Loaded`. [SQL:sql/copy-into-table, UG:data-load-considerations-manage]
- COPY transforms `(SELECT $1:a::NUMBER, METADATA$FILENAME FROM @stg)` allow no WHERE, ORDER BY, LIMIT, FLATTEN, JOIN, or GROUP BY; use `METADATA$START_SCAN_TIME` for load time. [UG:data-load-transform]
- Keep load and query warehouses separate; Small–Large is enough unless hundreds of files load concurrently. [UG:data-load-considerations-plan]

## Unloading

- `COPY INTO @stg/path/ FROM (SELECT ...)` supports CSV, JSON, PARQUET; `MAX_FILE_SIZE` defaults to 16 MB (max 5 GB); `SINGLE = TRUE` with an explicit filename. [SQL:sql/copy-into-location, UG:data-unload-considerations]
- Rerun-safe: `INCLUDE_QUERY_ID = TRUE` and a fresh path per run, not `OVERWRITE = TRUE`. [SQL:sql/copy-into-location]
- `PARTITION BY` forces INCLUDE_QUERY_ID and excludes SINGLE/OVERWRITE; partition only on dates, timestamps, or booleans (values reach internal logs). [SQL:sql/copy-into-location]
- `HEADER = TRUE` writes CSV headers and keeps real Parquet column names. [SQL:sql/copy-into-location]
- CSV: `FIELD_OPTIONALLY_ENCLOSED_BY`, or `EMPTY_FIELD_AS_NULL = FALSE` plus `NULL_IF`, to keep empty ≠ NULL. [UG:data-unload-considerations]
- Parquet: VARIANT becomes a JSON string; TIMESTAMP_NTZ(9) becomes milliseconds; cast TIMESTAMP_LTZ(9), ARRAY, OBJECT, MAP first. [UG:data-unload-considerations]
- Exfiltration guards (all default FALSE): `PREVENT_UNLOAD_TO_INLINE_URL`, `REQUIRE_STORAGE_INTEGRATION_FOR_STAGE_OPERATION`, `PREVENT_UNLOAD_TO_INTERNAL_STAGES`. [SQL:parameters, SQL:sql/copy-into-location]

## Monitoring

- Diagnose with read-only queries; REFRESH, FORCE_RESUME, and reloads need explicit permission. [U]
- `INFORMATION_SCHEMA.COPY_HISTORY` covers 14 days, post-TRUNCATE only; `ACCOUNT_USAGE.COPY_HISTORY` covers 365 days (latency ≤ 2 h); `LOAD_HISTORY` is bulk only. [SQL:functions/copy_history, SQL:account-usage/copy_history, SQL:account-usage/load_history]
- `ABORT_STATEMENT` failures don't appear in COPY_HISTORY; search QUERY_HISTORY. [SQL:sql/copy-into-table]
- Snowpipe cost is in `PIPE_USAGE_HISTORY` (`CREDITS_USED`, `BYTES_BILLED`); Streaming cost is in `METERING_HISTORY` with `SERVICE_TYPE = 'SNOWPIPE_STREAMING'`; resource monitors don't cap Snowpipe. [SQL:account-usage/pipe_usage_history, UG:snowpipe-streaming/snowpipe-streaming-high-performance-cost, UG:data-load-snowpipe-billing]
