# TypeScript runtimes and tests

Tags → skill://typescript/sources.md.

## Bun

- Bun transpiles and runs TS/TSX but never type-checks (`bun run`, `bun test`, `bun build`); `tsc --noEmit` is the checker. [BUN:bundler, BUN:runtime/transpiler, BUN:test]
- Bun API types come from `@types/bun` in `devDependencies` plus `"types": ["bun"]`. [BUN:runtime/typescript]
- Bun supports `.ts` import specifiers, top-level await, and JSX without extra config. [BUN:runtime/typescript]
- `bun build` does not down-level modern syntax. [BUN:bundler]

## Node

- Node strips erasable TypeScript by default (22.18+, stable since 24.12) and never type-checks. [NODE]
- Unsupported when stripping: `enum`, `namespace` with runtime code, parameter properties, import aliases, decorators (parse error), `.tsx`; `tsconfig` features such as `paths` are ignored. [NODE]
- Type-only imports need `import type` to strip correctly; the module system follows `package.json` `"type"` and the `.mts`/`.cts` extension. [NODE]
- `--experimental-transform-types` is gone (removed in 26.0.0). [NODE]

## Portable code

- Node builtins through `node:` specifiers (`node:fs/promises`, `node:path`); Bun implements them. [U]
- Read `process.env` once at startup and validate it (skill://typescript/types.md § Boundaries). [U, DG]
- Model the real environment in `lib` and `types`: no DOM globals in server code. [ET76, TSC:lib]

## Tests

- Bun projects test with `bun test` (API from `bun:test`); it runs tests in the Bun runtime without type-checking them. [BUN:test]
- Tests type-check too: a `tsconfig` that `tsc --noEmit` covers includes them. [ET77, BUN:test]
- Fake timers, never real sleeps; no `any` in fixtures; `satisfies` for fixture literals. [U, REL:4.9]
- Type-level behavior gets type tests. [ET55]
