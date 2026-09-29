---
description: "Throw and reject only Error instances created with new"
condition:
  - '\bthrow\s+(?:["''`]|\d|\{|\[|null\b|undefined\b)'
  - '\bthrow\s+(?!new\b)(?:[A-Z][\w$]*)?Error\s*\('
  - '\b(?:Promise\.)?reject\(\s*(?:["''`]|\{|\d)'
scope: "tool:edit(*.{ts,tsx,mts,cts}), tool:write(*.{ts,tsx,mts,cts})"
interruptMode: never
---

A thrown non-`Error` carries no stack trace and defeats `instanceof Error` narrowing in every `catch`.

| avoid | use |
|---|---|
| `throw "not found"`, `throw { code: 404 }` | `throw new NotFoundError("user 42 not found")` |
| `throw Error("failed")` | `throw new Error("failed")` |
| `reject("timeout")`, `Promise.reject({ code })` | `reject(new TimeoutError("fetch timed out after 5000 ms"))` |

Details: skill://typescript, skill://typescript/async.md.
