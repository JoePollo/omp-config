---
description: "Keep Time Travel on databases and schemas: no zero data retention at container level"
condition:
  - '(?i)\b(?:CREATE|ALTER)\s+(?:OR\s+(?:REPLACE|ALTER)\s+)?(?:TRANSIENT\s+)?(?:ACCOUNT|DATABASE|SCHEMA)\b[^;]{0,400}?\bDATA_RETENTION_TIME_IN_DAYS\s*=\s*0(?!\d)'
  - '(?i)\bMIN_DATA_RETENTION_TIME_IN_DAYS\s*=\s*0(?!\d)'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: tool-only
---

`DATA_RETENTION_TIME_IN_DAYS = 0` on an account, database, or schema disables Time Travel, point-in-time `CLONE`, and `UNDROP` for everything that inherits it; keep ≥ 1 day there and a `MIN_DATA_RETENTION_TIME_IN_DAYS` floor ≥ 1 on the account.

| avoid | use |
|---|---|
| `ALTER DATABASE analytics SET DATA_RETENTION_TIME_IN_DAYS = 0;` | inherit the default (1) or set 1–90 (Enterprise+) |
| zero retention to cut storage on churny data | `CREATE TRANSIENT TABLE ... DATA_RETENTION_TIME_IN_DAYS = 0` for that table only, with periodic copies to a permanent backup |

Details: skill://snowflake/tables.md.
Exception: transient scratch databases or schemas that hold only reproducible data.
