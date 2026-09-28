# Streaming and connectors

Tags → skill://snowflake/sources.md. Files, stages, COPY, and Snowpipe → skill://snowflake/ingestion.md.

## Choosing

- Snowpipe Streaming (high-performance): rows from apps, devices, CDC without files; latency as low as 5 s; billed in credits per uncompressed GB. Kafka connector v4: 5–10 s at the Streaming per-GB rate. Openflow: SaaS, database CDC, unstructured sources; bills SPCS compute pools + ingestion + telemetry. [UG:snowpipe-streaming/data-load-snowpipe-streaming-overview, UG:snowpipe-streaming/snowpipe-streaming-high-performance-cost, UG:kafka-connector/index, UG:data-integration/openflow/cost-spcs]

## Snowpipe Streaming

- New streaming code targets the high-performance architecture (GA AWS 2025-09-23, Azure 2025-11-05); classic has an advance deprecation notice (formal notice planned mid-2026, then 18-month sunset). [REL:2025/other/2025-09-23-snowpipe-streaming-high-performance-architecture, REL:2025/other/2025-11-05-snowpipe-streaming-azure-ga, UG:snowpipe-streaming/snowpipe-streaming-classic-deprecation]
- Elastic Channels (GA 2026-09-15, SDK ≥ 1.8.0) for at-least-once, unordered producers; Named Channels with offset tokens for ordered exactly-once (Kafka partitions, CDC). [REL:2026/other/2026-09-15-snowpipe-streaming-elastic-channels-ga, UG:snowpipe-streaming/data-load-snowpipe-streaming-overview]
- Prefer the SDK (Python `snowpipe-streaming` ≥ 3.9, Java 11+, Node.js 20+) over REST; adding it needs user approval via `uv add`. [UG:snowpipe-streaming/data-load-snowpipe-streaming-overview, U]
- Default pipe `<TABLE_NAME>-STREAMING` uses `MATCH_BY_COLUMN_NAME`, no transforms; create a named pipe for transforms or `CLUSTER_AT_INGEST_TIME = TRUE`. [UG:snowpipe-streaming/snowpipe-streaming-pipe-object, SQL:sql/copy-into-table]

## Kafka

- Kafka v4 (GA 2026-04-20): v3 cutover must finish within `offsets.retention.minutes` (default 7 days); no schema evolution into Iceberg tables. [REL:2026/other/2026-04-20-kafka-connector-v4-ga, UG:kafka-connector/index]

## Openflow

- Snowflake Deployments (SPCS) run on Azure; BYOC is AWS only; new deployments are gen 2 only since 2026-09-09. [UG:data-integration/openflow/about, REL:2026/other/2026-09-09-openflow-gen1-deployment-retirement]
- `Openflow_Control_Pool_0` bills while a deployment exists; suspend idle runtimes, consolidate deployments, pick the smallest runtime; CDC connectors also use a warehouse. [UG:data-integration/openflow/cost-spcs]
- Openflow Kafka connector: no autoscaling; set runtime min = max nodes. [UG:data-integration/openflow/connectors/kafka/about]
- Gen 2 connector as code (Preview): `CREATE OPENFLOW CONNECTOR <c> IN RUNTIME <r> FROM DEFINITION <id>` → edit `config.json` on `snow://openflow_connector/<db>.<schema>.<c>/versions/live/` with `GET`/`PUT` (Snowflake CLI; Snowsight can't) → `ALTER OPENFLOW CONNECTOR <c> COMMIT` → `START`; poll `SYSTEM$WAIT_FOR_STABLE_OPENFLOW_CONNECTORS`. [UG:data-integration/openflow/gen2/configure-connector-sql, REL:2026/other/2026-09-08-openflow-gen2-deployment-runtime-ga]
- Edits: `ADD LIVE VERSION FROM LAST` → PUT → `COMMIT` or `ABORT`; live edits don't touch a running connector until COMMIT. [UG:data-integration/openflow/gen2/connector-versioning]
- Promote a validated config via a Git repository stage: `ALTER ... PUSH TO '@repo/branches/<b>/connectors/<c>'`, then per environment `CREATE OPENFLOW CONNECTOR ... FROM '@repo/.../'` (starts with a default version, no COMMIT) or `ADD VERSION FROM '<stage>'` on a STOPPED connector. [UG:data-integration/openflow/gen2/connector-versioning, SQL:sql/create-openflow-connector, SQL:sql/alter-openflow-connector]
- Keep a `config.json` per environment (URLs, secret references, destinations updated before CREATE); names come from env config, never literals. [UG:data-integration/openflow/gen2/connector-versioning, U]
- Secrets: `valueType = SECRET_REFERENCE` to a Snowflake SECRET (usually `TYPE = GENERIC_STRING`); grant READ on it plus USAGE on its db/schema to the runtime `EXECUTE_AS_ROLE`; keep Git tokens out of committed SQL. [UG:data-integration/openflow/gen2/configure-connector-sql, SQL:sql/alter-openflow-connector]
