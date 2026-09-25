---
name: databricks-platform
description: Databricks platform knowledge base (Lakeflow Connect, Lakeflow/Spark Declarative Pipelines, Delta tables, Unity Catalog, data quality, data_platform bundle). Routed by rule://domain-router.
hide: true
---
# Databricks platform KB
Defaults only: explicit instructions, AGENTS.md, repo config/conventions win; a more specific domain KB (e.g. new-silver Data Vault modeling) wins for its own objects. Read every topic whose trigger matches. Tags → skill://databricks-platform/sources.md.

## Topics
| trigger | read |
|---|---|
| anything under `Databricks/bundles/data_platform/`: config YAML (`raw`, `bronze`, `silver`, `legacy_bronze`, `egress`), `resources/`, pipelines, transforms, egress, tests; adding sources, tables, models, expectations | skill://databricks-platform/data-platform-bundle.md |
| Lakeflow Connect, managed connectors, SQL Server change tracking/CDC, ingestion gateway, query-based ingestion, Auto Loader, `cloudFiles` | skill://databricks-platform/lakeflow-connect.md |
| `pyspark.pipelines`, `dlt`, `STREAMING TABLE`, `MATERIALIZED VIEW`, `AUTO CDC`, flows, sinks, watermarks, pipeline settings, `databricks.yml`, event log | skill://databricks-platform/pipelines.md |
| table DDL, `CLUSTER BY`, partitioning, `OPTIMIZE`, `VACUUM`, file size, `MERGE`, managed vs external, time travel | skill://databricks-platform/delta-tables.md |
| `GRANT`, ownership, catalogs, schemas, workspace bindings, storage, external locations, volumes, row filters, column masks, ABAC, access modes | skill://databricks-platform/unity-catalog.md |
| expectations, quarantine, validation gates, `CHECK`, `NOT NULL`, primary/foreign keys, anomaly detection, data profiling, quality metrics and alerts | skill://databricks-platform/data-quality.md |

## Core
- Inside `~/src/Databricks/bundles/data_platform` (the house SDP framework) read skill://databricks-platform/data-platform-bundle.md first; its `CONTRIBUTING.md` contract and code patterns win over the generic topics. [DP:CONTRIBUTING.md]
- Existing objects, legacy-migration sources, and maintenance-frozen bundles (`ils`, `build_job`, `dnb_datablocks`): keep their layout, config, and API style; fixes only; propose retrofits (managed conversion, clustering, `dlt` → `dp`), never apply them unasked. [U, DBX:README.md]
- New tables: Unity Catalog managed, liquid clustering (`CLUSTER BY AUTO` by default), predictive optimization; no `ZORDER` or manual file-size settings; partition only a quarantine routing table, on `is_quarantined`. [D:delta/best-practices, D:tables/clustering, DP:src/data_platform/pipelines/silver/silver.py]
- New pipelines: Lakeflow pipelines on serverless in triggered mode, deployed by bundle, run as a service principal; streaming tables ingest, materialized views join and aggregate; inside pipelines `AUTO CDC`, not hand-written `MERGE`. [LDP:best-practices, LDP:best-practices/production-readiness]
- Pipeline code: `from pyspark import pipelines as dp`; SQL `CREATE OR REFRESH STREAMING TABLE` / `MATERIALIZED VIEW`; `dlt`, `LIVE`, and `APPLY CHANGES` are legacy. [LDP:developer/python-ref, LDP:cdc, LDP:live-schema]
- No hardcoded catalog or environment names: bundle variables per target (`${var.source_catalog}`) and pipeline configuration parameters. [LDP:best-practices, DP:databricks.yml]
- Every dataset that can receive bad data carries expectations with a deliberate warn/drop/fail; quarantine what you drop; hard gates are separate pipelines ordered in a job. [LDP:best-practices/production-readiness, LDP:expectation-patterns]
- Access: grant to groups, groups own objects, only service principals get `MODIFY` in prod; files through volumes; never DBFS mounts or `hive_metastore`. [UC:best-practices]
- SQL Server sources: Lakeflow Connect managed connector; change tracking for tables with a primary key, CDC otherwise. [LC:sql-server-source-setup]
- Databricks SQL files: the quality gate lints with sqlfluff and needs the repo's `.sqlfluff` to declare `dialect = databricks`. [U]

## Diagnose (read-only queries)
| question | query |
|---|---|
| pipeline runs, failures, durations | `event_log('<pipeline-id>')` or data_platform's `<catalog>.audit.<pipeline>_event_log`; `system.lakeflow.pipelines`; `system.lakeflow_pipeline_events_preview.pipeline_events` (Beta) |
| DBU cost | `system.billing.usage` by `usage_metadata.dlt_pipeline_id`; `billing_origin_product` `LAKEFLOW_CONNECT`, `DATA_QUALITY_MONITORING` |
| table maintenance | `DESCRIBE HISTORY <t>`; `DESCRIBE TABLE EXTENDED <t> AS JSON` → `predictive_optimization_evaluations` (DBR 18+); `system.storage.predictive_optimization_operations_history` |
| data health | `<catalog>.audit.quarantine_summary`; `system.data_quality_monitoring.table_results` (Preview); `<schema>.<table>_profile_metrics`, `<schema>.<table>_drift_metrics` |
| constraints, metadata | `information_schema`; `DESCRIBE TABLE EXTENDED`; `SHOW CREATE TABLE` |

[LDP:monitor-event-logs, LDP:monitor-and-query-events, LC:monitor-costs, D:tables/clustering, D:optimizations/predictive-optimization, DQ:anomaly-detection, DQ:data-profiling/monitor-output, D:tables/constraints, DP:resources/__init__.py, DP:src/data_platform/quarantine_monitor/view.py]

## Local platform (observed 2026-09-25; repo config wins)
- One Unity Catalog metastore shared by the dev, tst, and prd workspaces; promotion runs dev → tst → prd. [U]
- Catalogs `dwh_<env>`, `sandbox_<env>`, `finance_analytics_<env>`; layers are `dwh_<env>` schemas `raw`, `raw_epicor`, `bronze`, `silver`, `gold`, `audit` (+ dev `config`, `raw_dev`; tst/prd `tmp`). [U]
- Catalogs are `ISOLATED` and workspace-bound; predictive optimization `ENABLE` on catalogs and schemas; `dwh_<env>` has catalog-level managed storage. [U]
- Classic compute: IaC clusters/pools `18.x-photon-scala2.13`, standard access mode (`USER_ISOLATION`); data_platform egress and raw-query clusters `17.3.x-scala2.13`. [U, DP:databricks.yml]
- SQL Server sources are UC connections `<source>_<env>` (`SQLSERVER`): epicor, ils, marxdb1, marxdb26, onbase, vision; Databricks-IaC `lakeflow_connections` owns them. [U]
- Jobs and pipelines: bundle `~/src/Databricks/bundles/data_platform` (active); `ils`, `build_job`, `dnb_datablocks` maintenance-frozen; `~/src/Databricks/legacy/` holds pre-Unity-Catalog notebooks (mounts, partitioned external tables), reference only; Terraform never adopts bundle resources. [DBX:README.md, U]
- Grants: `unity_catalog_permissions` in Databricks-IaC tfvars is the authoritative manifest for catalogs, schemas, tables, volumes, external locations, storage credentials, and connections (no broad principals, no `ALL_PRIVILEGES`, users only as RBAC `entra_user` exceptions); `system` catalog grants belong to `data-admin-rbac/metastore`; an ad-hoc SQL `GRANT` there is drift. [U]
- Owners: persistent UC securables → group `Data Platform Engineering`; SQL warehouses → `terraform_runner`; pipeline principals in grants: `bundle_runner`, `orchestration_mi`. [U]
