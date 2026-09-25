---
description: "Airflow code is environment-agnostic: no dev/tst/prd catalog or connection names"
condition:
  - '(?i)\b(?:dwh|sandbox|finance_analytics)_(?:dev|tst|prd)\b'
  - '(?i)azure_(?:dev|tst|prd)_managed_identity'
scope: "tool:edit(**/dags/**/*.{py,sql}), tool:write(**/dags/**/*.{py,sql}), tool:edit(**/include/**/*.{py,sql}), tool:write(**/include/**/*.{py,sql})"
interruptMode: never
---
One codebase deploys to dev, tst, and prd; environment names come from the Deployment.

| avoid | use |
|---|---|
| `"dwh_prd.silver.orders"` | `f"dwh_{os.environ['ENVIRONMENT']}.silver.orders"` or `dwh_{{ var.value.environment }}.silver.orders` |
| `"dwh_prd.audit.process_audit_log"` | `{{ var.value.uc_audit_table_ref }}` (env var `AIRFLOW_VAR_UC_AUDIT_TABLE_REF`) |
| `azure_conn_id="azure_prd_managed_identity"` | `f"azure_{os.environ['ENVIRONMENT']}_managed_identity"` |

Details: skill://airflow (Local platform).
Exception: tests and fixtures that assert per-environment values.
