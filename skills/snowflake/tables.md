# Tables, types, and storage lifecycle

Tags → skill://snowflake/sources.md.

## Table types and Time Travel

- Permanent is default (fixed 7-day Fail-safe, Snowflake-support recovery only); use TRANSIENT for reproducible staging/ETL, TEMPORARY for session scratch. [UG:tables-temp-transient, UG:data-failsafe]
- Type is fixed at creation; TRANSIENT databases/schemas make all children transient; convert via `CREATE TRANSIENT TABLE n LIKE o COPY GRANTS` + `INSERT ... SELECT`. [UG:tables-temp-transient, UG:table-considerations]
- A temporary table shadows a same-named table in its session (DROP and CREATE OR REPLACE hit it); drop temps explicitly. [UG:tables-temp-transient]
- `DATA_RETENTION_TIME_IN_DAYS` (default 1): Standard 0-1; Enterprise+ 0-90 permanent, 0-1 transient/temporary; unset levels inherit from the parent. [SQL:parameters, UG:data-time-travel]
- `MIN_DATA_RETENTION_TIME_IN_DAYS` (account-only, default 0) floors permanent tables at MAX(both). Keep >= 1 day; 0 disables Time Travel and UNDROP. [SQL:parameters, UG:data-time-travel]
- `UNDROP TABLE` restores the latest dropped version; rename a same-named table first. [UG:data-time-travel]

## Storage cost

- Updates, deletes and every CREATE OR REPLACE keep billed old versions through Time Travel then Fail-safe; spot churn via `FAILSAFE_BYTES / ACTIVE_BYTES` in `TABLE_STORAGE_METRICS`. [UG:tables-storage-considerations, SQL:account-usage/table_storage_metrics]
- Large high-churn tables: TRANSIENT with `DATA_RETENTION_TIME_IN_DAYS = 0` plus periodic copies to a permanent backup. [UG:tables-storage-considerations]

## Replace, alter, swap, clone

| | CREATE OR REPLACE | CREATE OR ALTER |
|---|---|---|
| Data | new table; old one in Time Travel; streams stale | kept; dropped columns lose data |
| Grants | explicit lost unless COPY GRANTS; future grants only without it | kept |
| Tags | only with COPY TAGS | kept (policies too); not settable |
| Atomic | yes | no |
| Rejects | - | CTAS, LIKE, CLONE, CHECK, Iceberg, hybrid, external |

- CREATE OR ALTER: a rename is drop + add (use `ALTER TABLE ... RENAME COLUMN`); omitted properties are unset; new columns go last. [SQL:sql/create-or-alter]
- Cut over rebuilds with `ALTER TABLE t SWAP WITH t_new` (atomic; OWNERSHIP on both; streams go stale). [SQL:sql/alter-table, SQL:sql/create-table]
- Clones share micro-partitions until changed; a dropped source keeps billing as `RETAINED_FOR_CLONE_BYTES`, so drop stale clones. [UG:tables-storage-considerations, SQL:account-usage/table_storage_metrics]
- Cloned tables get Automatic Clustering suspended and no lifecycle policy; database/schema clones inherit child grants only, skip external tables and internal-stage pipes, suspend tasks. [UG:object-clone, SQL:sql/create-clone]
- Clones keep fully qualified references pointing at the source; use partially qualified names so dev/tst clones resolve locally. [SQL:sql/create-clone, U]

## Data types

- Money: `NUMBER(p,s)`, never FLOAT (~15 digits, SUM/AVG drift); fix scale at creation, ALTER can't change it. DECFLOAT is exact but not for Iceberg, hybrid, Snowpark or non-SQL UDFs. [SQL:data-types-numeric, SQL:sql/alter-table-column]
- VARCHAR(n) counts characters (default 16777216, 128 MB byte cap); declare known lengths to catch misloads; CTAS of >16 MB values needs `VARCHAR(134217728)`. [SQL:data-types-text, UG:table-considerations, REL:bcr-bundles/2025_03/bcr-1942]
- Dates as DATE/TIMESTAMP_*, never VARCHAR; name the variant, bare TIMESTAMP follows `TIMESTAMP_TYPE_MAPPING` (default NTZ). LTZ renders in session `TIMEZONE`; TZ keeps a fixed offset (DST drifts). [UG:table-considerations, SQL:parameters, SQL:data-types-datetime]
- VARIANT/OBJECT/ARRAY max 128 MB; extract dates, numeric strings and arrays to typed columns. [SQL:data-types-semistructured, UG:semistructured-considerations]
- Structured `ARRAY(t)`, `OBJECT(k t)`, `MAP(k, v)` type nested data; not in dynamic, hybrid or external tables. [SQL:data-types-structured]
- Native `UUID` doesn't enforce uniqueness (not in hybrid or Snowpark); `VECTOR(INT|FLOAT, n<=4096)` usage: skill://snowflake/cortex.md. [SQL:data-types-uuid, SQL:data-types-vector]
- `LATERAL FLATTEN(INPUT => ..., OUTER => TRUE)` keeps rows with empty or missing arrays. [SQL:functions/flatten]

## Identifiers

- Create names unquoted (stored uppercase); quoted names stay case-sensitive and need quotes in every reference. [SQL:identifiers-syntax]
- Dynamic names: `IDENTIFIER()` over a literal, `$var`, bind or Scripting variable, never concatenation; env names from config. [SQL:identifier-literal, U]

## Constraints, sequences, defaults

- Standard tables enforce only NOT NULL and CHECK (CHECK blocks COPY INTO and pipes); PK/UNIQUE/FK are informational, and ENABLE or VALIDATE on them skips creation. [SQL:constraints-overview, SQL:sql/create-table-constraint]
- `RELY` on PK and FK enables join elimination; set it only when pipelines guarantee integrity, else results are wrong. [SQL:sql/create-table-constraint, UG:join-elimination]
- Sequences/IDENTITY are unique, not gap-free; NOORDER is default (`NOORDER_SEQUENCE_AS_DEFAULT`); manual IDENTITY inserts can duplicate. [UG:querying-sequences, SQL:sql/create-table, SQL:parameters]
- Set defaults at creation: ALTER can't add or change a non-sequence DEFAULT on an existing column. [SQL:sql/alter-table-column]

## Iceberg, hybrid, external, views, archiving

- Snowflake-managed Iceberg (`CATALOG = 'SNOWFLAKE'`): full DML and compaction; `EXTERNAL_VOLUME = 'SNOWFLAKE_MANAGED'` gives permanent tables Fail-safe, customer volumes don't. [UG:tables-iceberg]
- External-catalog Iceberg (catalog integration + external volume) has limited support; Time Travel is capped by snapshot age (max 5 days). [UG:tables-iceberg, UG:tables-iceberg-metadata]
- Catalog-linked databases (`LINKED_CATALOG = (CATALOG = '<int>')`, REST only) auto-sync namespaces; no clone/replication; CREATE OR REPLACE recreates the remote table. [UG:tables-iceberg-catalog-linked-database, UG:tables-iceberg]
- Hybrid tables (AWS/Azure) fit high-concurrency point reads/writes: PK required, keys enforced, 2 TB and ~16,000 ops/s per database; no Fail-safe, UNDROP, streams, clustering or replication. [UG:tables-hybrid, UG:tables-hybrid-limitations]
- External tables are read-only and slower; prefer Iceberg for Parquet/Delta. [UG:tables-external-intro]
- Use SECURE views only for privacy (they skip optimizations); views don't track base-column changes. [UG:views-secure, SQL:sql/create-view]
- Storage lifecycle policy: `CREATE STORAGE LIFECYCLE POLICY p AS (c TIMESTAMP) RETURNS BOOLEAN -> <expr>` + `ALTER TABLE t ADD STORAGE LIFECYCLE POLICY p ON (c)`; runs daily. [UG:storage-management/storage-lifecycle-policies-create-manage, SQL:sql/alter-table]
- `ARCHIVE_TIER` is fixed per table: COOL (min 90 days, fast) or COLD (min 180 days, 1/4 of COOL, up to 48 h retrieval, no Azure); restore via `CREATE TABLE ... FROM ARCHIVE OF`. [UG:storage-management/storage-lifecycle-policies]
