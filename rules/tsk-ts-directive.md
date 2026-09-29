---
description: "Fix the type error: never @ts-ignore or @ts-nocheck, and give @ts-expect-error a reason"
condition:
  - '@ts-(?:ignore|nocheck)\b'
  - '(?m)@ts-expect-error\s*$'
scope: "tool:edit(*.{ts,tsx,mts,cts}), tool:write(*.{ts,tsx,mts,cts})"
interruptMode: never
---

`@ts-ignore` and `@ts-nocheck` silence every error on the line or in the file, including future ones; a bare `@ts-expect-error` hides why the error is expected.

| avoid | use |
|---|---|
| `// @ts-ignore` above a failing line | fix the type: narrow, validate, or correct the declaration |
| `// @ts-nocheck` at the top of a file | fix the file's errors |
| `// @ts-expect-error` | `// @ts-expect-error: <reason>`, only when the approved plan allows it or in a type test |

Details: skill://typescript.
Exception: type tests that assert the compiler rejects a line.
