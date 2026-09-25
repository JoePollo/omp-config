---
description: "Catch specific exceptions; no bare except or silent broad handlers (PEP 8)"
condition:
  - '\bexcept\s*:'
  - '\bexcept\s*\(?\s*(?:BaseException|Exception)\s*\)?\s*(?:as\s+\w+\s*)?:\s*(?:pass\b|continue\b|\.\.\.)'
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
PEP 8: name the exceptions you expect; keep the `try` body minimal.

## Avoid

```python
try:
    rows = fetch(conn)
except:
    pass
```

## Use

```python
try:
    rows = fetch(conn)
except TimeoutError as err:
    raise LoadError(f"fetch timed out for {table}") from err
```

- Bare `except:` also catches `SystemExit` and `KeyboardInterrupt`.
- `except Exception` only at a boundary that calls `logger.exception(...)` or re-raises.
- Never `pass`/`continue` silently.
