---
description: "ACCOUNTADMIN is never a default, connection, or automation role"
condition:
  - '(?i)\bUSE\s+ROLE\s+"?ACCOUNTADMIN"?(?![\w$])'
  - '(?i)\brole\s*=\s*"ACCOUNTADMIN"'
  - '(?i)["'']role["'']\s*:\s*["'']ACCOUNTADMIN["'']'
  - '(?i)\bDEFAULT_ROLE\s*=\s*[''"]?ACCOUNTADMIN\b'
  - '(?i)(?:^|\n)[ \t]*role[ \t]*:[ \t]*["'']?ACCOUNTADMIN["'']?[ \t]*(?:\r?\n|$)'
scope: "tool:edit(*.{sql,py,ipynb,toml,yml,yaml}), tool:write(*.{sql,py,ipynb,toml,yml,yaml})"
interruptMode: tool-only
---

ACCOUNTADMIN: few human users with MFA, account-level administration only. Code, CI, tools, and default roles use least-privileged functional or service roles; objects are owned by custom roles under SYSADMIN.

| avoid | use |
|---|---|
| `USE ROLE ACCOUNTADMIN;` before creating databases, schemas, tables, warehouses | the environment's functional role from config (`USE ROLE <role>;`) |
| `snowflake.connector.connect(..., role="ACCOUNTADMIN")`, `role = "ACCOUNTADMIN"` in `connections.toml`, `role: ACCOUNTADMIN` in a dbt profile | a named connection whose role is the service role |
| `CREATE USER etl_svc DEFAULT_ROLE = ACCOUNTADMIN` | `CREATE USER etl_svc TYPE = SERVICE DEFAULT_ROLE = <service role>` |

Steps that require it (resource monitors, account parameters, some integrations) run once, by a human, with explicit approval. Details: skill://snowflake/access.md.
Exception: read-only audit queries that compare a role name as a single-quoted string literal.
