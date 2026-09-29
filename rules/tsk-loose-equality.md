---
description: "Use === and !==; == and != only to compare against null"
condition:
  - '(?<![=!<>])[=!]=(?!=)(?!\s*null\b)'
scope: "tool:edit(*.{ts,tsx,mts,cts}), tool:write(*.{ts,tsx,mts,cts})"
interruptMode: never
---

`==` and `!=` coerce their operands (`0 == ""` is true); strict equality never does.

| avoid | use |
|---|---|
| `count == 0`, `left != right` | `count === 0`, `left !== right` |
| `value == undefined` | `value == null` for null or undefined, or `value === undefined` |

Details: skill://typescript.
