---
name: databricks-silver-modeling
description: "Data Vault 2.0 default for new Databricks silver models: modeling, domain ownership, Delta/Spark physical rules. Routed by rule://domain-router; never for legacy-origin models."
hide: true
---
# Databricks silver modeling KB
Defaults only: explicit instructions, AGENTS.md, repo config/conventions win. Read every topic whose trigger matches. Tags → skill://databricks-silver-modeling/sources.md.

## Gate
- Apply: new silver models on Databricks (`dwh_<env>.silver`, env dev|tst|prd), Business Vault, PIT, bridge, gold marts reading them; includes new models whose data passed through a legacy system. [U]
- Skip: legacy-origin models — existing models ported, rebuilt at parity, or maintained from the deprecated stack (on-prem SQL Server DW, SSIS, Informatica IICS, Informatica CDI-PC); `legacy*` pipelines, paths, schemas (e.g. bundle pipeline `legacy-bronze`). Skip → keep the model's existing design. [U, L]
- Unclear origin → ask user before modeling.
- Conflicts: repo config > AGENTS.md > this KB.

## Topics
| trigger | read |
|---|---|
| hub, link, satellite, business key, hash key, hashdiff, load metadata, ghost record, Business Vault, PIT, bridge, gold mart design | skill://databricks-silver-modeling/modeling.md |
| ownership, domain boundaries, schema placement, onboarding a source or domain | skill://databricks-silver-modeling/domains.md |
| load code (MERGE, INSERT, streaming), DDL, clustering, concurrency, maintenance, VACUUM, slow queries | skill://databricks-silver-modeling/performance.md |
| citing, verifying, source conflicts | skill://databricks-silver-modeling/sources.md |

## Core
- New silver model → Data Vault 2.0 by default: Raw Vault (hub, link, satellite) + Business Vault where business rules apply. [DVA, BOOK, U]
- Other pattern → plan states model, pattern, reason, tradeoff before building. [U]
- Layers: bronze = staging input; silver = Raw Vault + Business Vault + PIT/bridge; gold = information marts. [SFD, SFT, DBW, SFF]
- Never write silver from ingestion; vault loads read bronze. [D:medallion]
- Hub = one business-key concept integrated across sources; never one per source or per domain. [SFG]
- Raw Vault: no business rules, cleansing, or filtering; rules → Business Vault. [SFG, DBG]
- Hub, link, satellite insert-only; history = satellites, never Delta time travel. [SFG, SFD, D:vacuum]
- Hash keys: `md5()` hex STRING from one shared convention; never `xxhash64`. [SFH, SFX, D:lc]
- Domain boundary at Business Vault + gold; one shared Raw Vault, never copied per domain. [SFM, SFF, DBG]
- Physical: UC managed Delta, `CLUSTER BY`, predictive optimization; no `PARTITIONED BY`, no `ZORDER`. [D:delta-bp, D:lc, D:po]
- Domain model ≠ file layout: clustering follows merge/filter keys, never domain lines. [D:lc, D:delta-bp]
- Consumers read gold marts built on PIT/bridge, not hubs/links/satellites. [SFD, DBW]
- Catalogs/schemas change only via Databricks-IaC Terraform; never ad hoc `CREATE SCHEMA`. [L]