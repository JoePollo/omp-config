---
description: "Snowflake stages authenticate through storage integrations, never inline cloud credentials"
condition:
  - '(?i)\bCREDENTIALS\s*=\s*["'']?\s*\(?\s*(?:AZURE_SAS_TOKEN|AWS_KEY_ID|AWS_SECRET_KEY|AWS_TOKEN)\s*='
scope: "tool:edit(*.{sql,py,ipynb,tf,yml,yaml}), tool:write(*.{sql,py,ipynb,tf,yml,yaml})"
interruptMode: tool-only
---

External stages and COPY/unload locations use `STORAGE_INTEGRATION = <integration name from env config>`; SAS tokens and keys written into DDL land in query history and Git.

## Avoid

```sql
CREATE STAGE raw_stage URL = 'azure://acct.blob.core.windows.net/raw/' CREDENTIALS = (AZURE_SAS_TOKEN = '?sv=...');
```

## Use

```sql
CREATE STAGE raw_stage URL = 'azure://acct.blob.core.windows.net/raw/' STORAGE_INTEGRATION = raw_azure_int FILE_FORMAT = parquet_fmt;
```

Integration setup (Azure consent, `Storage Blob Data Reader`/`Contributor` on the Snowflake service principal) and the `REQUIRE_STORAGE_INTEGRATION_FOR_STAGE_CREATION`/`_OPERATION` guards: skill://snowflake/ingestion.md.
Exception: none for committed code.
