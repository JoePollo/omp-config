# Data governance, sharing, and continuity

Tags → skill://snowflake/sources.md. Roles and grants: skill://snowflake/access.md; Time Travel and cloning: skill://snowflake/tables.md.

## Edition gates

| Capability | Edition | Source |
|---|---|---|
| Tags; database/share replication; replication groups; backups | All | UG:object-tagging/introduction, UG:account-replication-intro, UG:backups |
| Masking, row access, projection, aggregation policies; tag-based masking; tag propagation; classification; Access History; lineage; DMFs | Enterprise+ | UG:security-column-intro, UG:security-row-intro, UG:aggregation-policies, UG:classify-intro, UG:access-history, UG:data-quality-intro |
| Failover groups; account-object replication; Client Redirect; backup retention lock and legal hold | Business Critical+ | UG:replication-intro, UG:backups |

## Policy administration

- Keep tags, policies, classification profiles, and custom DMFs in one governance database (schemas such as `tags`, `policies`, `dmfs`); build qualified names from per-env config. [UG:tag-based-masking-policies, UG:security-row-using, U]
- Centralize: a security role creates policies and holds `APPLY MASKING POLICY ON ACCOUNT` and `APPLY TAG ON ACCOUNT`; object owners can't unset policies or see masked values. [UG:security-column-intro, UG:tag-based-masking-policies]
- Edit bodies in place with `ALTER MASKING POLICY` / `ALTER ROW ACCESS POLICY` (protection never lapses); simulate roles with `POLICY_CONTEXT` before rollout. [UG:security-column-intro, UG:security-row-intro]

## Masking and row access

- Check roles with `IS_ROLE_IN_SESSION('R')` (primary and secondary hierarchy; stored casing), not `CURRENT_ROLE() IN (...)`. Role names vary per env: read them from a mapping table or tag (`IS_ROLE_IN_SESSION(SYSTEM$GET_TAG_ON_CURRENT_TABLE('<db>.<sch>.allowed_role'))`). [SQL:functions/is_role_in_session, U]
- Masking applies in projections, JOIN, WHERE, and GROUP BY; an unmasked role's INSERT ... SELECT copies clear text, so protect target columns too. [UG:security-column-intro]
- A direct column policy beats a tag-based one; a column can't be in both masking and row access signatures; UDF, column, and policy types must match. [UG:tag-based-masking-policies, UG:security-column-intro]
- Row access policies run as the policy owner and filter SELECT and UPDATE/DELETE/MERGE targets, but never block INSERT; the table policy runs before view policies. [UG:security-row-intro]
- Keep mapping tables in the protected table's database (external tables not allowed); replace `EXISTS (SELECT ...)` lookups with a `MEMOIZABLE` SQL UDF returning ARRAY plus `ARRAY_CONTAINS`; cluster large tables on policy columns. [UG:security-row-intro, UG:security-row-using]

## Projection and aggregation

- Projection policy (`AS () RETURNS PROJECTION_CONSTRAINT`) hides output only; filters and joins still leak, so use it with trusted partners only. [UG:projection-policies, REL:2024/other/2024-05-03-policies]
- Aggregation policy (`AS () RETURNS AGGREGATION_CONSTRAINT`) sets a minimum group size, and small groups fold into a NULL-key remainder. Window functions, ROLLUP/CUBE, and recursive CTEs are blocked. Add an entity key for entity-level privacy. [UG:aggregation-policies]

## Tags

- Values are strings; `ALLOWED_VALUES` (<=5,000) must come first; limit is 50 tags per object and 50 distinct tags across a table's columns. [SQL:sql/create-tag, UG:object-tagging/introduction]
- Tags inherit down the hierarchy (schema to table to column), not through views; a manual set overrides inheritance; propagation and classification overwrite it. [UG:object-tagging/inheritance]
- `PROPAGATE = ON_DEPENDENCY | ON_DATA_MOVEMENT | ON_DEPENDENCY_AND_DATA_MOVEMENT` (Enterprise+): dependencies stay synced; CTAS, INSERT, MERGE, UPDATE, and COPY INTO copy once; manual target tags win; limit is 10,000 targets per transaction. [UG:object-tagging/propagation]
- Set `ON_CONFLICT` (the default value is `CONFLICT`): `ALLOWED_VALUES_SEQUENCE`, or `MERGE`, which needs irreversible `MULTI_VALUE = TRUE`. `CREATE OR ALTER TAG` resets omitted params, including `PROPAGATE`. [UG:object-tagging/propagation, UG:object-tagging/multi-value-tags, SQL:sql/create-tag]

## Tag-based policies

- `ALTER TAG t SET MASKING POLICY p_str, MASKING POLICY p_num` (one policy per data type); tag the schema to protect future tables. Tag-based row access, projection, aggregation, and join policies are (Preview, 2026-07-21). [UG:tag-based-policies, REL:2026/other/2026-07-21-tag-based-policies-preview]
- Assigned tags and policies can't be dropped; no MVs over tag-masked tables; a table moved to another schema is covered by the target schema's tag policy, not the source's. [UG:tag-based-masking-policies]

## Classification

- `CREATE SNOWFLAKE.DATA_PRIVACY.CLASSIFICATION_PROFILE p({'minimum_object_age_for_classification_days': 0, 'maximum_classification_validity_days': 30, 'auto_tag': true, 'tag_map': {...}})`; then `ALTER DATABASE d SET CLASSIFICATION_PROFILE = '<db>.<sch>.p'`. [UG:classify-auto]
- A `tag_map` from `SNOWFLAKE.CORE.SEMANTIC_CATEGORY` to your tag plus tag-based masking masks new PII automatically; dry-run with `CALL SYSTEM$CLASSIFY('<table>', '<profile>')`. [UG:classify-auto, SQL:stored-procedures/system_classify]
- Runs on serverless credits; views are excluded by default (they cost more). Read results in `ACCOUNT_USAGE.DATA_CLASSIFICATION_LATEST` (<=3 h lag). `'ai_mode': true` is (Preview, 2026-08-17). [UG:classify-intro, UG:classify-results, REL:2026/other/2026-08-17-sensitive-data-classification-ai-mode-preview]

## Audit and lineage

- `ACCOUNT_USAGE.ACCESS_HISTORY` (365 d, <=3 h lag) columns: `direct_objects_accessed`, `base_objects_accessed`, `objects_modified` (column lineage), and `policies_referenced`. [UG:access-history, SQL:account-usage/access_history]
- `OBJECT_DEPENDENCIES` misses references hidden in session variables or functions, so keep session variables out of view and UDF bodies. [UG:object-dependencies]
- `SNOWFLAKE.CORE.GET_LINEAGE('<obj>', 'TABLE', 'DOWNSTREAM', 5)` (max distance 5; 1-year retention). PUBLIC holds `VIEW LINEAGE` by default; revoke it to restrict. [SQL:functions/get_lineage-snowflake-core, UG:ui-snowsight-lineage, REL:bcr-bundles/un-bundled/bcr-1933]

## Data quality

- `ALTER TABLE t ADD DATA METRIC FUNCTION SNOWFLAKE.CORE.NULL_COUNT ON (c) EXPECTATION no_nulls (VALUE = 0)`. Expectations allow only comparison and logical operators on `VALUE`. [UG:data-quality-working, UG:data-quality-expectations]
- `DATA_METRIC_SCHEDULE` applies per object: default 1 h; `'<n> MINUTE'`, `'USING CRON ... UTC'`, or `'TRIGGER_ON_CHANGES'`; `''` suspends all. [UG:data-quality-working, REL:bcr-bundles/2025_07/bcr-2101]
- Only scheduled runs are billed; limit is 50,000 associations per account; not supported on hybrid tables, streams, or shared objects. [UG:data-quality-intro]
- System DMFs live in `SNOWFLAKE.CORE`. Custom DMFs take `TABLE(...)` args and run as the table owner unless `EXECUTE AS ROLE` is set, and that role changes policy-filtered counts. [UG:data-quality-system-dmfs, UG:data-quality-custom-dmfs, UG:data-quality-access-control]
- Evaluate `SNOWFLAKE.LOCAL.DATA_QUALITY_MONITORING_RESULTS` by `measurement_time`. [UG:data-quality-results, UG:data-quality-working]

## Sharing

- Shares are zero-copy and read-only. Direct shares stay in-region; listings reach any region via auto-fulfillment (10 TB default cap). [UG:data-sharing-intro, SF:guides-overview-sharing, SF:collaboration/collaboration-listings-about, SF:collaboration/provider-listings-auto-fulfillment]
- Share secure views or UDFs over a private schema, filtered on `CURRENT_ACCOUNT()`; test with `SIMULATED_DATA_SHARING_CONSUMER`. `SECURE_OBJECTS_ONLY = FALSE` is irreversible. [UG:data-sharing-secure-views, UG:data-sharing-views]
- Consumers get NULL from `CURRENT_ROLE`, `CURRENT_USER`, and `IS_ROLE_IN_SESSION`, so share a database role and check `IS_DATABASE_ROLE_IN_SESSION`. [UG:security-column-intro, UG:data-sharing-policy-protected-data]
- Reader accounts (`CREATE MANAGED ACCOUNT ... TYPE = READER`): the provider pays all credits, so add resource monitors (default limit is 20 accounts). [UG:data-sharing-reader-create]
- Cross-region direct share: a replication group with `OBJECT_TYPES = DATABASES, SHARES` that includes every database the view references. [UG:secure-data-sharing-across-regions-platforms]

## Continuity

- Failover groups can be promoted to read-write; set `REPLICATION_SCHEDULE` on the primary (lag <= 2x interval). [UG:account-replication-intro, UG:replication-intro]
- Not replicated: temporary, external, and hybrid tables, or Time Travel history. Replicate the policy database first; dangling policy references leave targets unprotected. [UG:account-replication-intro, UG:account-replication-considerations]
- Backups (GA 2025-12-10; never use the deprecated `SNAPSHOT` names): `CREATE BACKUP SET s FOR TABLE t WITH BACKUP POLICY p`; restore with `CREATE TABLE t2 FROM BACKUP SET s IDENTIFIER '<id>'`. [UG:backups, REL:2025/other/2025-12-10-worm-backups]
- `WITH RETENTION LOCK` is irreversible, even by Support, and blocks dropping the containing schema, database, or account. New backups skip transient tables (Pending). [UG:backups, REL:bcr-bundles/2026_06/bcr-2360]
