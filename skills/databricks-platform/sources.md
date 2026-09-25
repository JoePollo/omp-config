# Databricks platform KB sources
Verified 2026-09-25 against Microsoft Learn (Azure) and docs.databricks.com (AWS) mirrors of the same articles, and the user's repositories. Re-verify on DBR upgrades, product renames, or data_platform contract changes.

| tag | source |
|---|---|
| `D:<path>` | https://learn.microsoft.com/en-us/azure/databricks/<path> (AWS mirror: https://docs.databricks.com/aws/en/<path>) |
| `LDP:<p>` | `D:ldp/<p>` (Lakeflow Declarative Pipelines) |
| `LC` · `LC:<p>` | `D:ingestion/lakeflow-connect/` · `D:ingestion/lakeflow-connect/<p>` |
| `UC:<p>` | `D:data-governance/unity-catalog/<p>` |
| `DQ` · `DQ:<p>` | `D:data-governance/unity-catalog/data-quality-monitoring/` · `D:data-governance/unity-catalog/data-quality-monitoring/<p>` |
| `AL` | `D:ingestion/cloud-object-storage/auto-loader/production` |
| `SDP` | https://spark.apache.org/docs/latest/declarative-pipelines-programming-guide.html (Apache Spark Declarative Pipelines, Spark 4.2) |
| `DP:<path>` | ~/src/Databricks/bundles/data_platform/<path> (house metadata/config-driven SDP bundle) |
| `DBX:<path>` | ~/src/Databricks/<path> (bundles repository root) |
| `U` | user environment, observed 2026-09-25: ~/.omp/agent/AGENTS.md; ~/.omp/agent/agents/quality-gate.md; ~/src/Databricks-IaC (`main.tf`, `modules/workspace/*`, `tfvars/*.tfvars`, `.github/index.md`, `DATABRICKS_TERRAFORM_PLAN.md`); ~/src/data-admin-rbac/metastore/README.md |

## Snapshot
- Names: Lakeflow pipelines / Lakeflow Declarative Pipelines (formerly DLT; open-source core = Spark Declarative Pipelines); Declarative Automation Bundles (formerly Databricks Asset Bundles); `AUTO CDC` (formerly `APPLY CHANGES`); data profiling (formerly Lakehouse Monitoring) with SDK `w.data_quality` (formerly `quality_monitors`).
- Release states: `pipeline_events` system table Beta; anomaly detection Public Preview (percent-null, completeness slicing, UI alerts Beta); `VACUUM ... LITE` Public Preview; `UNIQUE` constraints Public Preview; configurable dropped-table recovery Public Preview; integrated CDC continuous mode Beta; query-based hard-delete tracking Beta.
- Version gates: liquid clustering GA DBR 15.4 LTS+ (Delta); `CLUSTER BY AUTO` UC managed + DBR 15.4 LTS+; `OPTIMIZE ... FULL` DBR 16.4+; `OPTIMIZE ... FULL WHERE` and `REPLACE PARTITIONED BY WITH CLUSTER BY` DBR 18.1+; `SET MANAGED` DBR 17.3 LTS+ or serverless; PK/FK GA DBR 15.2+; `UNIQUE` DBR 18.2+; `DROP FEATURE` for checks DBR 15.4 LTS+; ABAC serverless or DBR 16.4+; row filters/masks DBR 12.2 LTS+; `cloudFiles.cleanSource` DBR 16.4 LTS+; bundle Python resources Databricks CLI 0.275.0+ (`databricks-bundles>=0.275.0` in data_platform).
- Limits: ≤ 16 parallel dataset updates per pipeline update; SQL Server ≤ 250 tables per pipeline (integrated CDC ≤ 300; data_platform query pipelines cap 250); staging purged after 30 days; change tracking retention default `2 DAYS` (utility script v1.5); 2 CDC capture instances per table; ≤ 4 clustering keys; VACUUM retention default 7 days, log retention 30 days; dropped managed tables recoverable 7 days by default; profiling `Snapshot` ≤ 4 TB, time-series/inference metrics over the last 30 days; ABAC ≤ 20 principals per policy.
- Predictive optimization: default for accounts created on or after 2024-11-11; existing accounts rolled out through 2026-08.

## Conflicts resolved
- Inside data_platform, `CONTRIBUTING.md` and existing code patterns win over the generic topics (Databricks KB Core rule 1).
- Partitioning: docs' quarantine example and data_platform silver `_snapshot_all` partition a routing table by `is_quarantined` (LDP:expectation-patterns, DP:src/data_platform/pipelines/silver/silver.py) while new tables use liquid clustering (D:tables/clustering) → that routing partition is the one sanctioned exception.
- `MERGE`: pipelines use `AUTO CDC` (LDP:best-practices); egress `merge` tables `MERGE` into SQL Server by design (DP:src/data_platform/egress/apply.py); outside pipelines follow the MERGE performance guidance (D:delta/best-practices).
- `OPTIMIZE` cadence: "run OPTIMIZE frequently" (D:delta/best-practices) vs "schedule no OPTIMIZE where predictive optimization runs" (D:tables/clustering) → predictive optimization governs UC managed tables; schedules only where it is off or for external tables.
- File-size knobs (D:tables/tune-file-size) apply to external and legacy tables only; UC managed tables auto-tune.
- Serverless: output pipelines are serverless; data_platform raw query ingestion defaults to classic compute (`ingestion.runtime.serverless: false`) and egress runs on a classic cluster (DP:CONTRIBUTING.md) → keep workload-specific compute.
- Grants: `DBX:docs/egress/deployment.md` prescribes manual SQL `GRANT`s on `{catalog}.audit` while Databricks-IaC `unity_catalog_permissions` manages `dwh_<env>` schema grants authoritatively (U) → change grants in the IaC manifest and flag the doc.
- Catalog literals: `DP:src/data_platform/pipelines/bronze/bronze.py` (`dwh_dev` fallback for `epicor_union`) and `DP:resources/dashboards/silver_quarantine_monitor.lvdash.json` (`dwh_dev`) are drift from `${var.source_catalog}`; never copy them.
- Comment-free YAML (DP:CONTRIBUTING.md) vs comments in three config files → contract wins for new edits; existing comments stay unless removal is requested.
- New-silver Data Vault objects: the silver modeling KB wins for modeling and object-level physical design; this KB supplies platform defaults and the current `legacy_*` silver mechanics.
