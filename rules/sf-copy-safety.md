---
description: "COPY INTO: no silent partial loads, forced reloads, or blind purges"
condition:
  - '(?i)\bON_ERROR\s*[=:]\s*[''"]?CONTINUE\b'
  - '(?i)\bCOPY\s+INTO\b[\s\S]{0,2000}?\bFORCE\s*=\s*TRUE\b'
  - '(?i)\bPURGE\s*=\s*TRUE\b'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: tool-only
---

Loads are complete and exactly-once: keep the defaults (`ON_ERROR = ABORT_STATEMENT` for COPY, `SKIP_FILE` for pipes), let load metadata dedupe files, and delete staged files only after a verified load.

| avoid | use |
|---|---|
| `ON_ERROR = CONTINUE` (or `on_error="continue"`) with no error check | default `ABORT_STATEMENT`; pre-check with `VALIDATION_MODE = RETURN_ERRORS`; when CONTINUE is required, fail the job if `VALIDATE(<table>, JOB_ID => '_last')` returns rows |
| `FORCE = TRUE` to reload a path | `LOAD_UNCERTAIN_FILES = TRUE` for files past the 64-day load metadata; `FORCE` only for a deliberate full reload into an emptied table |
| `PURGE = TRUE` | `REMOVE @stage/<path>` after `COPY_HISTORY` shows `Loaded` (PURGE failures are silent) |

Details: skill://snowflake/ingestion.md.
Exception: throwaway exploration loads into scratch tables.
