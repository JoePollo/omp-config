# Databricks silver modeling KB sources
Verified live 2026-09-25. Re-verify tier 3 on Databricks Runtime upgrades.
Tiers: 1 Data Vault canon · 2 practitioner (Data Vault specialists, Databricks Data Vault articles) · 3 current platform docs · L local repo facts · U user decisions.
Conflicts: modeling semantics → higher tier; platform behavior/syntax/defaults → current tier 3 over tier 2; object placement → L.

| tag | tier | source |
|---|---|---|
| `DVA` | 1 | Data Vault Alliance, "Your Data Vault 2.0 Introduction - A Grounded Perspective" (2022-08-12) — https://datavaultalliance.com/engineering/data-vault-2-0-an-introduction/ |
| `BOOK` | 1 | Linstedt & Olschimke, *Building a Scalable Data Warehouse with Data Vault 2.0* (Morgan Kaufmann, 2015) — no URL |
| `SFG` | 2 | Olschimke (Scalefree), "Data Vault Glossary: Hub, Link, Satellite, Business Vault, and More" (2026-05-04) — https://www.scalefree.com/blog/data-vault/data-vault-glossary-hub-link-satellite-business-vault-and-more/ |
| `SFH` | 2 | Winkelmann (Scalefree), "Hash Keys in Data Vault" (2017-04-28) — https://www.scalefree.com/blog/data-vault/hash-keys-in-the-data-vault/ |
| `SFX` | 2 | Olschimke (Scalefree), "Data Vault Hashing on Databricks with XXHASH64" (2025-09-05) — https://www.scalefree.com/knowledge/webinars/data-vault-friday/data-vault-hashing-on-databricks-with-xxhash64/ |
| `SFB` | 2 | Winkelmann (Scalefree), "Bridge Tables 101: Why They Are Useful" (2019-03-13) — https://www.scalefree.com/blog/data-vault/bridge-tables-101/ |
| `SFD` | 2 | Kirschke (Scalefree), "Data Vault on Databricks: Does It Make Sense?" (2025-05-22) — https://www.scalefree.com/blog/tools/data-vault-on-databricks-does-it-make-sense/ |
| `SFT` | 2 | Kirschke (Scalefree), "Databricks and dbt: A Practical Approach to Data Vault Implementation" (2025-08-21) — https://www.scalefree.com/blog/tools/databricks-and-dbt-a-practical-approach-to-data-vault-implementation/ |
| `SFW` | 2 | Olschimke (Scalefree), "Data Vault on Databricks" webinar (2023-04-21; video, lists concerns without written answers) — https://www.scalefree.com/knowledge/webinars/data-vault-friday/data-vault-on-databricks/ |
| `SFM` | 2 | Winkelmann (Scalefree), "Data Vault and Data Mesh: Not Versus, But Together" (2026-06-01) — https://www.scalefree.com/blog/data-vault/data-vault-and-data-mesh-not-versus-but-together/ |
| `SFF` | 2 | Winkelmann (Scalefree), "Data Vault & Data Mesh in a Data Fabric: A Modern Architecture Guide" (2025-04-24) — https://www.scalefree.com/blog/data-vault/data-vault-data-mesh-in-a-data-fabric-a-modern-architecture-guide/ |
| `DBG` | 2 | Bhatt, Shaikh, Wiebe (Databricks), "Prescriptive Guidance for Implementing a Data Vault Model on the Databricks Lakehouse Platform" (2022-06-24; platform advice dated) — https://www.databricks.com/blog/2022/06/24/prescriptive-guidance-for-implementing-a-data-vault-model-on-the-databricks-lakehouse-platform.html |
| `DBW` | 2 | Databricks, "What is a Data Vault?" (2022-04-21) — https://www.databricks.com/blog/what-is-data-vault |
| `D:medallion` | 3 | https://docs.databricks.com/aws/en/lakehouse/medallion |
| `D:delta-bp` | 3 | https://docs.databricks.com/aws/en/delta/best-practices |
| `D:merge` | 3 | https://docs.databricks.com/aws/en/delta/merge |
| `D:lsm` | 3 | https://docs.databricks.com/aws/en/optimizations/low-shuffle-merge |
| `D:lc` | 3 | https://docs.databricks.com/aws/en/tables/clustering |
| `D:po` | 3 | https://docs.databricks.com/aws/en/optimizations/predictive-optimization |
| `D:filesize` | 3 | https://docs.databricks.com/aws/en/tables/tune-file-size |
| `D:rlc` | 3 | https://docs.databricks.com/aws/en/optimizations/isolation/row-level-concurrency |
| `D:isolation` | 3 | https://docs.databricks.com/aws/en/optimizations/isolation/ |
| `D:constraints` | 3 | https://docs.databricks.com/aws/en/tables/constraints |
| `D:dfp` | 3 | https://docs.databricks.com/aws/en/optimizations/dynamic-file-pruning |
| `D:vacuum` | 3 | https://docs.databricks.com/aws/en/tables/operations/vacuum |
| `D:vacuum-sql` | 3 | https://docs.databricks.com/aws/en/sql/language-manual/delta-vacuum |
| `D:props` | 3 | https://docs.databricks.com/aws/en/tables/table-properties |
| `D:autocdc` | 3 | https://docs.databricks.com/aws/en/ldp/cdc |
| `D:masks` | 3 | https://docs.databricks.com/aws/en/data-governance/unity-catalog/filters-and-masks/ |
| `D:md5` | 3 | https://docs.databricks.com/aws/en/sql/language-manual/functions/md5 |
| `D:sha2` | 3 | https://docs.databricks.com/aws/en/sql/language-manual/functions/sha2 |
| `SPK` | 3 | Apache Spark SQL Performance Tuning (4.2.0) — https://spark.apache.org/docs/latest/sql-performance-tuning.html |
| `L` | L | ~/src/Databricks-IaC/main.tf (catalog `dwh_${var.ENV}`; schemas raw, raw_epicor, bronze, silver, gold, audit; dev config, raw_dev; tst/prd tmp) · ~/src/Databricks-IaC/DATABRICKS_TERRAFORM_PLAN.md (supported baseline; IaC owns catalogs/schemas; bundle pipelines incl. `legacy-bronze`, source not local) · no Data Vault objects, naming, or hashing convention found |
| `U` | U | User decisions 2026-09-25: Data Vault = default, deviations need stated rationale; legacy boundary = model origin; TTSR reminders on |

## Snapshot
- Clustering key types: Date, Timestamp, TimestampNTZ, String, Integer/Long/Short/Byte, Float/Double/Decimal; no BINARY; ≤4 keys; GA DBR 15.4 LTS+. [D:lc]
- Clustering on write: `INSERT INTO`, CTAS/RTAS, `COPY INTO` (Parquet), append writes above size thresholds (UC managed: 64 MB for 1 key, 256 MB for 2). [D:lc]
- `VACUUM table_name { { FULL | LITE } | DRY RUN }`: no `RETAIN` clause; retention via `delta.deletedFileRetentionDuration` (default `interval 1 week`). [D:vacuum-sql, D:props]
- Row-level concurrency: DBR 14.3 LTS+, unpartitioned, deletion vectors. [D:rlc]
- Row filters/column masks: DBR 12.2 LTS+; ABAC policies recommended across many tables. [D:masks]
- AUTO CDC: Lakeflow pipelines (serverless or Pro/Advanced); replaces APPLY CHANGES. [D:autocdc]
- `md5` → STRING hex; `sha2(expr, 0|224|256|384|512)` → STRING hex. [D:md5, D:sha2]

## Conflicts resolved
- Hash key type: SFX BINARY(16) vs D:lc (BINARY not clusterable) → md5 hex STRING.
- PIT/bridge location: SFG/SFB Business Vault vs DBG gold → silver Business Vault helpers.
- Layout: DBG Z-order + 32–64 MB files (2022) vs D:lc/D:filesize → liquid clustering + auto file size.
- Security satellites: SFG split by security/privacy vs SFD UC masking → masks/row filters/ABAC, no split.
- History: Delta time travel vs satellites → satellites (D:vacuum retention).
- DVA author: byline Mark Budzinski vs page metadata Daniel Linstedt → cite Data Vault Alliance.

## Open (ask user when first needed)
- Hash normalization (trim, case, delimiter, null token, column order); metadata column names; table naming.