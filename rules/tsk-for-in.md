---
description: "Iterate with for...of over Object.entries, keys, or values; never for...in"
condition:
  - '\bfor\s*\(\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*\s+in\s'
scope: "tool:edit(*.{ts,tsx,mts,cts}), tool:write(*.{ts,tsx,mts,cts})"
interruptMode: never
---

`for...in` visits inherited enumerable keys and yields array indexes as strings.

| avoid | use |
|---|---|
| `for (const key in config)` | `for (const [key, value] of Object.entries(config))` |
| `for (const index in items)` | `for (const item of items)` or `for (const [index, item] of items.entries())` |

Details: skill://typescript.
