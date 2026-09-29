---
description: "Narrow, default, or throw instead of the ! non-null assertion"
condition:
  - '[\w$)\]]!(?=[.\[);,])'
scope: "tool:edit(*.{ts,tsx,mts,cts}), tool:write(*.{ts,tsx,mts,cts})"
interruptMode: never
---

`!` tells the compiler a value exists without checking; a wrong guess becomes a runtime `TypeError` far from its cause.

| avoid | use |
|---|---|
| `users.get(id)!.name` | `const user = users.get(id); if (user === undefined) throw new Error("unknown user");` |
| `path.split("/").at(-1)!` | `path.split("/").at(-1) ?? ""` |
| `match.index!` | narrow first: `if (match.index === undefined) return;` |

Details: skill://typescript.
