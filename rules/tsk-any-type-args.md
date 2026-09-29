---
description: "No any in type arguments, arrays, unions, or return types; use unknown or the real type"
condition:
  - '(?:[<,|&]|=>)\s*any\b(?![\w$])'
  - '\bany\[\]'
scope: "tool:edit(*.{ts,tsx,mts,cts}), tool:write(*.{ts,tsx,mts,cts})"
interruptMode: never
---

`any` switches checking off wherever it flows; the builtin `ts-no-any` rule covers `: any` and `as any`, this rule covers the other positions.

| avoid | use |
|---|---|
| `Promise<any>`, `Record<string, any>`, `any[]` | `Promise<User>`, `Record<string, unknown>`, `unknown[]` |
| `(input: string) => any` | the real return type, or `unknown` then narrow |
| `string | any` | the real union |

Details: skill://typescript, skill://typescript/types.md.
