---
name: typescript
description: TypeScript domain knowledge base (Handbook and TSConfig reference, TypeScript 6/7 releases, Google TypeScript Style Guide, typescript-eslint, Effective TypeScript, Bun and Node runtimes, Biome). Routed by rule://domain-router.
hide: true
kb:
  files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/tsconfig*.json', '**/bunfig.toml']
  content:
    - { files: '**/package.json', pattern: '"(?:typescript|typescript-eslint|@types/(?:bun|node)|@typescript/native-preview)"\s*:' }
  commands: ['^(?:tsc|tsgo)\b', '^bunx?\s+(?:x\s+)?(?:tsc|tsgo)\b', '^bun\s+(?:test|build)\b']
  topics:
    - file: types.md
      content: [{ files: '**/*.{ts,tsx,mts,cts}', pattern: '\b(?:type|interface|class|function)\s+[\w$]+\s*<|\b(?:keyof|infer|satisfies|asserts)\s|\)\s*:\s*[\w$]+\s+is\s+[\w$]+|\bJSON\.parse\(|\.json\(\s*\)' }]
    - file: classes.md
      content: [{ files: '**/*.{ts,tsx,mts,cts}', pattern: '^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s' }]
    - file: async.md
      content: [{ files: '**/*.{ts,tsx,mts,cts}', pattern: '\basync\s|\bawait\s|\bPromise\b|\.then\(' }]
    - file: declarations.md
      files: ['**/*.d.ts', '**/*.d.mts', '**/*.d.cts']
      content: [{ files: '**/*.{ts,mts,cts}', pattern: '^\s*declare\s+(?:global|module)\b' }]
    - file: project.md
      files: ['**/tsconfig*.json', '**/bunfig.toml']
      content: [{ files: '**/package.json', pattern: '"(?:typescript|typescript-eslint|@types/(?:bun|node)|@typescript/native-preview)"\s*:' }]
      commands: ['^(?:tsc|tsgo)\b', '^bunx?\s+(?:x\s+)?(?:tsc|tsgo)\b']
    - file: runtime.md
      files: ['**/bunfig.toml', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx']
      content: [{ files: '**/*.{ts,tsx,mts,cts}', pattern: '\bBun\.|\bfrom\s+["'']bun(?::[\w-]+)?["'']|\bprocess\.(?:env|argv|exit)\b|\bimport\.meta\.(?:dir|dirname|filename|path|main)\b' }]
      commands: ['^bun\s+(?:test|build)\b']
---

# TypeScript KB

Defaults only: explicit instructions, AGENTS.md, repo config/conventions win; ~/.omp/agent/CONTRIBUTING.md § Extensions owns OMP extension conventions. Read every topic whose trigger matches. Tags → skill://typescript/sources.md.

## Topics

| trigger | read |
|---|---|
| generics, overloads, conditional or mapped types, `keyof`, `infer`, `satisfies`, type guards, narrowing, `JSON.parse`, validating untyped input | skill://typescript/types.md |
| `class`, constructors, fields, visibility, `readonly`, accessors, `override`, decorators | skill://typescript/classes.md |
| `async`/`await`, promises, callbacks, timers, cancellation | skill://typescript/async.md |
| `*.d.ts`, `declare global`, `declare module`, published packages and their types | skill://typescript/declarations.md |
| `tsconfig*.json`, `package.json`, `bunfig.toml`; compiler options, TypeScript 6/7 upgrades, lint or format config, new project | skill://typescript/project.md |
| Bun or Node execution, `Bun.*`, `bun:test`, `process`, `import.meta`, `bun test`, `bun build`, tests | skill://typescript/runtime.md |

## Core

- Source order when guides disagree: Handbook and TSConfig reference > typescript-eslint > Google TypeScript Style Guide > Effective TypeScript; resolutions in skill://typescript/sources.md § Conflicts resolved. [U]
- Types vanish at runtime and soundness is a non-goal: validate every untyped input (JSON, env, argv, HTTP, files, tool args) at the boundary, then trust the types inside. [DG, ET48, ET74]
- Erasable syntax only: no `enum`, runtime `namespace`, parameter properties, or `import x = require()`; code must run under Node type stripping and `erasableSyntaxOnly`. [U, TSC:erasableSyntaxOnly, NODE, ET72]
- `strict: true` everywhere; never loosen compiler or lint options to pass a check. [TSC:strict, U]
- Existing repos keep their layout, config, and style; propose retrofits, never apply them unasked. [U, G:consistency]
- Target TypeScript 7 (`tsc` is the native compiler) and the 6.0/7.0 defaults; a repo's pinned `typescript` wins. [REL:7.0, REL:6.0]

## Workflow

- After each edit batch: `tsc --noEmit` from the directory holding `tsconfig.json`, then `biome lint <files>` or the repo's lint script; the quality gate runs both. [U, BIOME:linter]
- Bun and Node execute TypeScript without type-checking: a run or a passing test proves nothing about types. [BUN:bundler, NODE]
- The formatter owns layout (quotes, semicolons, width, wrapping, import order) through repo config; never hand-format or reformat untouched code. [U, G:reformatting-existing-code]
- Never `@ts-ignore` or `@ts-nocheck`; `// @ts-expect-error: <reason>` or `// biome-ignore <rule>: <reason>` only when the plan approves it. [G:@ts-ignore, TSE:ban-ts-comment, U]
- Smallest change that meets the requirement; no speculative parameters, overloads, generics, or abstractions. [U, H:2/functions]
- Internal APIs: migrate every caller in one cutover; published packages mark the old API `@deprecated` with migration directions, then remove it in a major. [U, G:deprecation]

## Types

- Values of unknown type are `unknown`, narrowed before use; `any` only inside a boundary function that validates at once. [H:2/functions, G:any-type, ET43, ET46]
- Primitives `string` `number` `boolean` `bigint` `symbol`; `object` or `Record<string, T>` for non-primitives; never `String`, `Number`, `Boolean`, `Object`, `Function`, or `{}`. [DD, G:wrapper-types, G:{}-type, ET10]
- Object shapes are `interface`s, extended rather than intersected; `type` for unions, tuples, functions, mapped and conditional types. [G:prefer-interfaces-over-type-literal-aliases, PERF, ET13]
- Finite sets: string-literal unions or `as const` objects. [H:enums, ET72]
- Variants: discriminated unions on a literal field, handled by an exhaustive `switch`. [H:2/narrowing, ET29, ET34, ET59]
- Absence: optional `?` members and parameters; `null` only where an external API or JSON uses it; no `| null` or `| undefined` inside type aliases. [G:prefer-optional-over-undefined, G:nullable-undefined-type-aliases, ET32, ET33]
- Build values with annotations or `satisfies`, never `as`: `const config: Config = {…}`. [G:type-assertions-and-object-literals, REL:4.9, ET9]
- Assertions (`as`, `!`) only with an obvious local reason; prefer narrowing or a thrown error. [G:type-and-non-nullability-assertions, TSE:no-non-null-assertion]
- Exported functions and methods declare parameter and return types; locals rely on inference. [U, TSC:isolatedDeclarations, G:type-inference, ET18]
- `readonly` fields, `readonly T[]` parameters, and `as const` literals for data never mutated. [G:use-readonly, H:2/objects, ET14]
- Arrays: `T[]` for simple element types, `Array<T>` for complex ones. [G:array-t-type]
- Dynamic keys: `Map` or `Set`; `Record<K, V>` for small static literals; index signatures name their key. [G:indexable-types-index-signatures, ET16]

## Names and modules

- `UpperCamelCase` types, classes, interfaces, type parameters; `lowerCamelCase` values, functions, parameters, properties; `CONSTANT_CASE` module-level constants. [G:rules-by-identifier-type, G:constants]
- Acronyms as words (`loadHttpUrl`); descriptive names; no `_` prefix or suffix. [G:camel-case, G:descriptive-names, G:_-prefix-suffix]
- Files are `kebab-case.ts` unless the repo differs. [U]
- ES modules only; `import type` and `export type` for type-only symbols (`verbatimModuleSyntax`). [G:use-modules-not-namespaces, G:import-type, TSC:verbatimModuleSyntax, NODE]
- Named exports; a default export only where a host requires one (OMP extension entry). [G:exports, U]
- Export only what other modules use; no `export let`; no static-only container classes. [G:export-visibility, G:mutable-exports, G:container-classes]
- Relative imports within a project, Node builtins as `node:` specifiers, static imports only. [G:import-paths, U]

## Functions

- `function` declarations for named functions; arrows for callbacks or to keep the outer `this`; no function expressions. [G:prefer-function-declarations-for-named-functions, G:do-not-use-function-expressions]
- Rest parameters, not `arguments`; spread, not `.apply`. [G:prefer-rest-and-spread-when-appropriate]
- Default parameters simple and side-effect free; many optional parameters become one destructured options object. [G:parameter-initializers]
- `this` only in classes, their methods, and arrows inside them. [G:this]

## Idioms

- `const` by default, `let` when reassigned, never `var`; one declaration per statement. [G:use-const-and-let, G:one-variable-per-declaration]
- `===` and `!==`; `== null` only to test for null and undefined together. [G:equality-checks]
- `??` and `?.` wherever `0`, `""`, or `false` are valid values; never `||` for their defaults. [TSE:prefer-nullish-coalescing]
- Iterate with `for...of` over arrays and `Object.entries`, `keys`, or `values`; never `for...in`. [G:iterating-objects, G:iterating-containers, ET60]
- Parse numbers with `Number()` plus a `Number.isNaN` check; no unary `+`, no `parseInt` or `parseFloat` for base 10. [G:type-coercion]
- Array and object literals; never `new Array()`, `new Object()`, or wrapper constructors. [G:do-not-use-the-array-constructor, G:do-not-use-the-object-constructor, G:wrapper-objects-for-primitive-types]
- Template literals interpolate only strings and numbers. [G:template-literals, TSE:restrict-template-expressions]
- `switch`: `default` last; no fall-through between non-empty cases. [G:switch-statements, TSC:noFallthroughCasesInSwitch]
- Never `eval`, `new Function(string)`, `with`, `debugger`, or changes to builtin prototypes. [G:dynamic-code-evaluation, G:with, G:debugger-statements, G:modifying-builtin-objects]

## Errors

- Throw and reject only `Error` instances created with `new`; subclass when callers must tell errors apart. [G:only-throw-errors, G:instantiate-errors-using-new, TSE:only-throw-error]
- Catch variables are `unknown`: narrow with `instanceof Error` before reading fields. [TSC:useUnknownInCatchVariables]
- An empty `catch` carries a comment giving the reason; `try` blocks stay focused. [G:empty-catch-blocks, G:keep-try-blocks-focused]
- Messages name the failing value and are greppable. [U]

## Local platform (observed 2026-09-29; repo config wins)

- `tsc` 7.0.2 (`typescript@7.0.2`, Bun global, `C:\Users\jpollock\scoop\persist\bun\bin\tsc.exe`); Bun 1.4.2 and Biome 2.5.14 from Scoop; Node 24.21.0. [U]
- Not installed: `tsgo`, ESLint, typescript-eslint, oxlint, Prettier, Deno, `typescript-language-server`; adding any is a new dependency (AGENTS.md). [U]
- OMP's `typescript-native` language server (`tsc --lsp --stdio`) starts only when the session cwd holds its root markers. [OMP:lsp-config]
- `~/.omp/agent/extensions/**/*.ts` have no `tsconfig.json`: the gate lints them and never type-checks them; Bun runs them. [U]
- No TypeScript repos under `~/src`. [U]
