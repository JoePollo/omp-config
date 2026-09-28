---
description: "Snowflake connections: named config, org-account identifier, workload identity or key pair; no passwords or literal hosts"
condition:
  - 'snowflake\.connector\.connect\s*\([\s\S]{0,600}?\bpassword\s*='
  - '\baccount\s*=[\s\S]{0,400}?\bpassword\s*=|\bpassword\s*=[\s\S]{0,400}?\baccount\s*='
  - '["'']account["'']\s*:[\s\S]{0,300}?["'']password["'']\s*:|["'']password["'']\s*:[\s\S]{0,300}?["'']account["'']\s*:'
  - '(?i)\b[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\.snowflakecomputing\.(?:com|cn)\b'
  - '(?i)\bTYPE\s*=\s*LEGACY_SERVICE\b'
scope: "tool:edit(*.{py,ipynb,sql,toml,yml,yaml}), tool:write(*.{py,ipynb,sql,toml,yml,yaml})"
interruptMode: tool-only
---

Connect through a named connection from per-environment config. Services authenticate with workload identity federation (Azure managed identity) or a key pair; Snowflake blocks password sign-in for non-human users (Phase 3, rolling Aug–Oct 2026).

| avoid | use |
|---|---|
| `snowflake.connector.connect(account="myorg-prd.snowflakecomputing.com", user="svc", password=pw)` | `snowflake.connector.connect(connection_name=os.environ["SNOWFLAKE_CONNECTION_NAME"])` |
| `Session.builder.configs({"account": a, "user": u, "password": p}).create()` | `Session.builder.config("connection_name", name).create()` |
| `account = "xy12345.east-us-2.azure.snowflakecomputing.com"` | `account = "<orgname>-<accountname>"` from config |
| `CREATE USER etl_svc TYPE = LEGACY_SERVICE PASSWORD = '...'` | `CREATE USER etl_svc TYPE = SERVICE WORKLOAD_IDENTITY = (TYPE = AZURE ISSUER = '...' SUBJECT = '...')`, or `ALTER USER etl_svc ADD KEY PAIR ...` |

Service connections: `authenticator="WORKLOAD_IDENTITY"`, `workload_identity_provider="AZURE"` (connector ≥ 3.17.0); else `authenticator="SNOWFLAKE_JWT"` with `private_key_file`. Humans: `externalbrowser` or `OAUTH_AUTHORIZATION_CODE`. Details: skill://snowflake/access.md, skill://snowflake/devops.md.
Exception: a programmatic access token passed as `password` from a secret store under a network policy; read-only audits comparing `type = 'LEGACY_SERVICE'` as a string literal.
