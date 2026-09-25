# Domains
Tags → skill://databricks-silver-modeling/sources.md.

## Ownership
- Central platform team: staging, Raw Vault, load automation, platform governance. [SFM, SFF]
- Domain teams: Business Vault rules, gold marts, KPI definitions, data products. [SFM, SFF]
- Business Vault may be organized by domain; stewards/SMEs own its rules. [DBG]
- Never a per-domain Raw Vault or per-domain source ingestion. [SFM]
- Business key concept shared by domains = one hub; domain meaning differs in Business Vault. [SFG, SFM]

## Change
- New source or domain → add hubs, links, satellites; existing entities unchanged. [DVA, DBW, SFM]
- New source's attributes → new satellite (split by source). [SFG]

## Placement (verified 2026-09-25)
- Catalog `dwh_<env>`, env dev|tst|prd. [L]
- Upstream `raw`, `raw_epicor`, `bronze`: never vault targets; vault loads read `bronze`. [L, SFD]
- `silver`: Raw Vault, Business Vault, PIT, bridge. [L, SFD]
- `gold`: information marts. [L, D:medallion]
- No per-domain schemas exist; add via Databricks-IaC Terraform, never ad hoc. [L]
- Domain lines never drive `CLUSTER BY` or file layout (performance.md). [D:lc]