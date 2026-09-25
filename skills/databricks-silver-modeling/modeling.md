# Data Vault modeling
Tags → skill://databricks-silver-modeling/sources.md.

## Business key
- Identifier the business uses (customer number, product code); prefer enterprise-wide, stable keys shared across sources. [SFG]
- Preference: global > organisational > source surrogate (last resort). [SFG]
- Composite key → hash all parts. [SFH]
- Business key columns stored beside the hash key in hubs and links. [SFG]

## Hub
- One per business-key concept: distinct keys + load timestamp + record source; no attributes, no relationships. [SFG, DBW]
- Insert-only; delete only under legal obligation. [SFG]

## Link
- Distinct relationship between hub keys; may connect >2 hubs; keys + load metadata only. [SFG, DBG]
- Relationship attributes, start/end, effectivity → link satellite. [SFG]
- Finest source grain; grain shift or aggregation → bridge. [SFB]

## Satellite
- Attributes + history for exactly one parent hub or link, referenced by the parent hash key; never attached to another satellite. [SFG, DBW]
- New row only when the hash key is new to the satellite or its hashdiff differs from that key's latest row; never update. [SFH, SFG]
- Split by source system; also by rate of change when attribute groups change at materially different rates. [SFG]
- No security/PII split: UC column masks + row filters; ABAC policies across many tables. [SFD, D:masks]
- Source deletes, (de)activation → effectivity satellite; hub key kept. [SFG]
- End dates derived at read time (PIT, views); never stored by update. [SFG]
- AUTO CDC SCD2 target ≠ Raw Vault satellite (superseded rows carry `__END_AT`). [D:autocdc]

## Hash key + hashdiff
- `md5(<normalized key string>)` → 32-char hex STRING. [SFH, D:md5]
- STRING, not BINARY(16): BINARY can't be a clustering key (overrides SFX BINARY advice). [D:lc, SFX]
- Never `xxhash64`/`hash()` for vault keys: ≤64-bit, collision-prone, not portable. [SFX]
- `sha2(<x>, 256)` only when a stronger collision guarantee is required. [SFX, D:sha2]
- Same business key → same hash in every hub, link, satellite. [SFH]
- Compute hash keys + hashdiff once per staged row before vault loads; check collisions there. [SFH]
- Normalization (trim, case, delimiter, null token, column order): one repo convention; none exists (2026-09-25) → ask user before the first hub. [L]
- PK constraints informational only; uniqueness comes from load design (performance.md). [D:constraints]
- `NOT NULL` on hash key, load timestamp, record source (enforced). [D:constraints]

## Load metadata
- Every hub/link/satellite row: load timestamp (TIMESTAMP, never DATE) + record source. [SFG]
- Load timestamp = arrival in platform, not source event time. [SFG]
- Metadata column and table naming: repo convention; none exists → ask user with the hashing convention. [L]

## Ghost record
- Ghost (zero-key) record in hubs/satellites for missing references; fixed default key values. [SFG]

## Business Vault
- Hub/link/satellite structures holding derived data: cleansing, dedup, conversions, DQ tags, calculated attributes. [SFG, DBG]
- Optional: clean Raw Vault data may feed marts directly. [SFG]
- Domain-owned; multiple versions of truth over one Raw Vault. [SFG, SFM]
- Default view; materialize when measured cost/latency requires. [SFD]

## PIT + bridge
- PIT: per hub/link, the satellite load timestamps valid at each snapshot; removes temporal multi-satellite joins. [SFG, DBG]
- Bridge: pre-joined link paths across hubs; may shift grain/aggregate for marts. [SFG, SFB]
- Location `dwh_<env>.silver` as Business Vault helpers; derived, rebuildable (DBG puts them in gold; silver chosen). [SFG, SFB]
- Never copy SFB sample SQL (author-corrected).

## Information mart (gold)
- Star or flat-wide shapes over PIT/bridge + Business Vault in `dwh_<env>.gold`. [SFG, DBW, SFD]
- Many small use-case marts, not one large mart. [SFG]
- Default view; materialized view/table when query complexity, volume, or refresh frequency requires. [SFD, SFG]