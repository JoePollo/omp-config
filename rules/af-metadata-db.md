---
description: "Airflow 3 task and trigger code cannot open metadata DB sessions or query ORM models"
condition:
  - '\bfrom\s+airflow\.settings\s+import\s+[^\n]*\bSession\b'
  - '\bsettings\.Session\s*\('
  - '\bfrom\s+airflow\.utils\.session\s+import\b'
  - '@provide_session\b'
  - '\bfrom\s+airflow\.models(?:\.\w+)?\s+import\s+[^\n]*\b(?:TaskInstance|DagRun|DagModel|XCom)\b'
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
Airflow 3 workers reach the API server through the Task Execution API; direct metadata-database access from tasks fails.

| need | use |
|---|---|
| current run, task instance, params | `get_current_context()` (`dag_run`, `ti`, `params`) |
| upstream results | XCom through TaskFlow arguments or `.output` |
| other DAGs' runs, task states, pools | Airflow REST API `/api/v2` (Astro: Bearer API token) |
| variables, connections | `from airflow.sdk import Variable, Connection` |

Details: skill://airflow/tasks.md.
Exception: tooling that runs outside Airflow tasks (platform maintenance scripts).
