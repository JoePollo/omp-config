---
description: "Erasable TypeScript only: no enum, runtime namespace, parameter properties, or import = aliases"
condition:
  - '(?m)^\s*(?:export\s+)?(?:const\s+)?enum\s+[A-Za-z_$]'
  - '(?m)^\s*(?:export\s+)?(?:namespace|module)\s+[A-Za-z_$][\w$.]*\s*\{'
  - '\bconstructor\s*\((?:[^)]*?,)?\s*(?:public|private|protected|readonly)\s+[A-Za-z_$]'
  - '(?m)^\s*(?:export\s+)?import\s+[A-Za-z_$][\w$]*\s*=\s*(?:require\s*\(|[A-Za-z_$])'
scope: "tool:edit(*.{ts,tsx,mts,cts}), tool:write(*.{ts,tsx,mts,cts})"
interruptMode: never
---

Node type stripping and `erasableSyntaxOnly` accept only TypeScript syntax that erases to plain JavaScript; these constructs emit runtime code.

| avoid | use |
|---|---|
| `enum Color { Red, Green }`, `const enum Color {…}` | `type Color = "red" | "green"` or `const Color = { Red: "red", Green: "green" } as const` |
| `namespace Util { … }` | an ES module with named exports |
| `constructor(private readonly db: Db) {}` | `private readonly db: Db;` plus `constructor(db: Db) { this.db = db; }` |
| `import fs = require("node:fs")`, `import Item = Models.Item` | `import { readFileSync } from "node:fs"`, `import { Item } from "./models.ts"` |

Details: skill://typescript, skill://typescript/classes.md.
Exception: ambient `declare enum` and `declare namespace` in `.d.ts` files that describe third-party code.
