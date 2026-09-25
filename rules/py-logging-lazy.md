---
description: "Pass logging arguments lazily; no f-strings or pre-formatted messages"
condition:
  - '\b(?:log|logger|logging|_log|_logger|LOG|LOGGER|_LOGGER)\.(?:debug|info|warning|warn|error|exception|critical|log)\(\s*(?:[rR]?[fF]|[fF][rR])["'']'
  - '\b(?:log|logger|logging|_log|_logger|LOG|LOGGER|_LOGGER)\.(?:debug|info|warning|warn|error|exception|critical|log)\(\s*(?:"[^"]*"|''[^'']*'')\s*(?:%|\.format\()'
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
logging HOWTO / Google §3.10.1: constant %-template; values as arguments.

## Avoid

```python
logger.info(f"Loaded {count} rows from {table}")
```

## Use

```python
logger.info("Loaded %d rows from %s", count, table)
```

- Tracebacks: `logger.exception("Load failed for %s", table)` inside `except`.
- Structured context: `extra={"table": table}`.
