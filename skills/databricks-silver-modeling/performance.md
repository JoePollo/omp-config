# Delta + Spark performance
Tags → skill://databricks-silver-modeling/sources.md. Platform docs (tier 3), not Data Vault methodology; runtime-specific.

## Cost drivers
- Write: many narrow MERGE targets per run; each MERGE scans target files unless pruning applies. [D:delta-bp, SFW]
- Read: joins across hubs, links, satellites; temporal satellite joins cost most. [SFD, SFW]
- Domain boundaries aren't a cost driver; fix cost with load batching, clustering, PIT/bridge, marts.

## Tables
- UC managed Delta + predictive optimization (auto OPTIMIZE, VACUUM, ANALYZE); no scheduled OPTIMIZE jobs alongside it. [D:delta-bp, D:po, D:lc]
- `CLUSTER BY` on every new table; never `PARTITIONED BY` or `ZORDER`. [D:lc]
- Raw Vault clustering key: hub/link hash key; satellite parent hash key. [D:lc, DBG]
- Other tables: dominant filter columns (≤4 keys; fewer below 10 TB), else `CLUSTER BY AUTO`. [D:lc]
- Clustering on write covers `INSERT INTO`, CTAS/RTAS, append writes above size thresholds; MERGE-inserted rows need `OPTIMIZE`. Without predictive optimization schedule `OPTIMIZE` every 1–2 h on busy tables. [D:lc, D:lsm]
- No hand-tuned file sizes on UC managed tables; ignore DBG 32–64 MB + Z-order advice. [D:filesize, D:lc]
- Unpartitioned + deletion vectors + DBR 14.3 LTS+ → row-level concurrency; never disable deletion vectors. [D:rlc, D:lc]

## Loads
- Read bronze incrementally; streaming reads for append-only bronze. [D:medallion]
- Hub/link: one insert-only MERGE per table per run over the deduped union of all staged sources: `MERGE INTO t USING s ON t.<hk> = s.<hk> WHEN NOT MATCHED THEN INSERT *`. [D:merge]
- One writer per hub/link per run: PK unenforced and concurrent insert-only MERGEs of one new key aren't guaranteed to conflict → duplicates. [D:constraints, D:isolation]
- Never time-bound hub/link match conditions (keys can be any age); pruning comes from hash-key clustering + dynamic file pruning (MERGE DFP needs Photon). [D:lc, D:dfp]
- Satellite: insert staged rows whose hash key is new or whose hashdiff differs from the key's latest row; collapse consecutive duplicate hashdiffs in the batch first. [SFH, D:merge]
- MERGE source: ≤1 row per target match key; re-running a batch inserts nothing. [D:merge]
- Different targets load in parallel; hash keys remove parent lookups. [SFH]
- Blind INSERT (no read of its target) never conflicts; INSERT reading its target = MERGE concurrency. [D:isolation]
- Loads metadata-driven: one template per entity type (hub, link, satellite), generated or parameterized per repo convention; no hand-written per-table loads. [SFM, SFW]

## Reads
- Multi-satellite/multi-link queries → PIT/bridge; BI → flat-wide gold marts. [SFD, SFG]
- AQE on by default (skew split, partition coalescing, sort-merge → broadcast); keep on. [SPK]
- Small hubs/reference tables auto-broadcast below `spark.sql.autoBroadcastJoinThreshold`; join hints only when `EXPLAIN` proves need. [SPK]
- Stats: predictive optimization runs ANALYZE; without it, `ANALYZE TABLE` after large loads. [D:po, SPK]
- No Spark caching (`.cache()`, `CACHE TABLE`) on Delta. [D:delta-bp]
- `RELY` only on keys verified unique; wrong RELY → wrong results; its rewrites need Photon. [D:constraints]

## Retention
- Time travel = recovery only; defaults: data files 7 days (`delta.deletedFileRetentionDuration` = `interval 1 week`), log 30 days. [D:vacuum, D:props]
- Retention ≥ 7 days; never `SET spark.databricks.delta.retentionDurationCheck.enabled = false`. [D:vacuum]