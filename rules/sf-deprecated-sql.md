---
description: "Retired or renamed Snowflake SQL: task overlap flag, snapshots, immutability constraints"
condition:
  - '(?i)\bALLOW_OVERLAPPING_EXECUTION\b'
  - '(?i)\b(?:CREATE|ALTER|DROP|SHOW|DESC(?:RIBE)?)\s+(?:OR\s+REPLACE\s+)?SNAPSHOT\s+(?:POLICY|POLICIES|SET|SETS)\b'
  - '(?i)\bFROM\s+SNAPSHOT\s+SET\b'
  - '(?i)\bIMMUTABLE\s+WHERE\b'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: tool-only
---

Write the current syntax; the old forms are deprecated or renamed.

| avoid | use |
|---|---|
| `ALLOW_OVERLAPPING_EXECUTION = TRUE` | `OVERLAP_POLICY = NO_OVERLAP` (default) \| `ALLOW_CHILD_OVERLAP` \| `ALLOW_ALL_OVERLAP` on the root task; overlap only idempotent graphs |
| `CREATE SNAPSHOT POLICY`, `CREATE SNAPSHOT SET`, `... FROM SNAPSHOT SET` | `CREATE BACKUP POLICY`, `CREATE BACKUP SET s FOR TABLE t WITH BACKUP POLICY p`, `CREATE TABLE t2 FROM BACKUP SET s IDENTIFIER '<id>'` |
| `IMMUTABLE WHERE (...)` on a dynamic table | `FROZEN WHERE (...)` |

Details: skill://snowflake/pipelines.md (tasks, dynamic tables), skill://snowflake/governance.md (backups).
Exception: read-only `SHOW`/audit queries over existing objects.
