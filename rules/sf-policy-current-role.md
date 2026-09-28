---
description: "Masking and row access policies test roles with IS_ROLE_IN_SESSION, not CURRENT_ROLE()"
condition:
  - '(?i)\b(?:CREATE|ALTER)\s+(?:OR\s+(?:REPLACE|ALTER)\s+)?(?:MASKING|ROW\s+ACCESS|PROJECTION|AGGREGATION)\s+POLICY\b[\s\S]{0,800}?\bCURRENT_ROLE\s*\(\s*\)'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: tool-only
---

Policy bodies check roles with `IS_ROLE_IN_SESSION('<ROLE>')` (primary and secondary role hierarchy) or a mapping table or tag; role names differ per environment, and `CURRENT_ROLE()` returns NULL for share consumers.

## Avoid

```sql
CREATE MASKING POLICY pii_mask AS (v STRING) RETURNS STRING ->
  CASE WHEN CURRENT_ROLE() IN ('PAYROLL_PRD') THEN v ELSE '***' END;
```

## Use

```sql
CREATE MASKING POLICY pii_mask AS (v STRING) RETURNS STRING ->
  CASE WHEN IS_ROLE_IN_SESSION(SYSTEM$GET_TAG_ON_CURRENT_TABLE('governance.tags.pii_reader_role')) THEN v ELSE '***' END;
```

Keep policies in one governance schema; edit bodies with `ALTER ... SET BODY`. Details: skill://snowflake/governance.md.
Exception: none.
