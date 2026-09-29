---
description: "Parse untrusted JSON to unknown and validate it; never assert JSON.parse or response.json() to a type"
condition:
  - '\bJSON\.parse\([^;]*?\)\s*as(?!\s+(?:unknown|const)\b)\s+[A-Za-z_$]'
  - '\.json\(\s*\)\s*\)?\s*as(?!\s+unknown\b)\s+[A-Za-z_$]'
  - '\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*:(?!\s*unknown\b)[^=;]+=\s*JSON\.parse\('
scope: "tool:edit(*.{ts,tsx,mts,cts}), tool:write(*.{ts,tsx,mts,cts})"
interruptMode: never
---

Types vanish at runtime: `JSON.parse` and `response.json()` return unchecked data, so an assertion or annotation certifies what nobody verified.

| avoid | use |
|---|---|
| `JSON.parse(text) as Config` | `const raw: unknown = JSON.parse(text);`, then validate into `Config` |
| `(await response.json()) as User` | `const raw: unknown = await response.json();`, then validate |
| `const config: Config = JSON.parse(text)` | parse to `unknown`, validate, then type |

Validate with the repo's schema library (OMP extensions: `pi.arktype`); otherwise a type guard that checks every field the type relies on.

Details: skill://typescript/types.md.
