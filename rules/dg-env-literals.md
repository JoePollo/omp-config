---
description: "Dagster code is environment-agnostic: no dev/tst/prd catalog names or Databricks workspace hosts"
condition:
  - '(?i)\b(?:dwh|sandbox|finance_analytics)_(?:dev|tst|prd)\b'
  - '(?i)\badb-\d+\.\d+\.azuredatabricks\.net\b'
scope: "tool:edit(**/defs/**/*.{py,sql,yaml,yml}), tool:write(**/defs/**/*.{py,sql,yaml,yml}), tool:edit(**/definitions.py), tool:write(**/definitions.py)"
interruptMode: tool-only
---

One codebase deploys to dev, tst, and prd; environment names and hosts come from the deployment's environment variables.

| avoid | use |
|---|---|
| `"dwh_prd.silver.orders"` | `f"dwh_{os.environ['ENVIRONMENT']}.silver.orders"` (Dagster+: derive the name from `DAGSTER_CLOUD_DEPLOYMENT_NAME`) |
| `host="https://adb-1234567890123456.7.azuredatabricks.net"` | `host=dg.EnvVar("DATABRICKS_HOST")` |
| `host: https://adb-1234567890123456.7.azuredatabricks.net` in `defs.yaml` | `host: "{{ env.DATABRICKS_HOST }}"` |

Details: skill://dagster/resources.md (Environments).
Exception: tests and fixtures that assert per-environment values.
