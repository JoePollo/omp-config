---
description: "Pass encoding=\"utf-8\" for text I/O; default is the locale encoding before 3.15 (PEP 597, PEP 686)"
condition:
  - '(?m)(?:^|[^\w.])open\((?![^\n]*\bencoding\s*=)(?![^\n]*["''][rwxat+]*b[rwxat+]*["''])'
  - '\.(?:read_text|write_text)\((?![^\n]*\bencoding\s*=)'
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
Before 3.15 the default text encoding is the locale's (e.g. cp1252 on Windows).

| avoid | use |
|---|---|
| `open(path)` / `open(path, "w")` | `open(path, encoding="utf-8")` |
| `p.read_text()` | `p.read_text(encoding="utf-8")` |
| `p.write_text(s)` | `p.write_text(s, encoding="utf-8")` |

Binary modes (`"rb"`, `"wb"`) take no encoding. Locale on purpose: `encoding="locale"` (3.10).
