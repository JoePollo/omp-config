# TypeScript KB sources

Verified 2026-09-29 against typescriptlang.org (Handbook, TSConfig reference, 4.9 release notes), the TypeScript 6.0 and 7.0 announcements, the TypeScript wiki, the Google TypeScript Style Guide, typescript-eslint.io, the Effective TypeScript README, bun.com, nodejs.org, biomejs.dev, the npm registry, and the local toolchain. Re-verify on TypeScript minors (next: 7.1 and its API), typescript-eslint majors, Bun or Node majors, and Biome minors.

| tag | source |
|---|---|
| `H:<path>` | <https://www.typescriptlang.org/docs/handbook/><path>.html |
| `DD` | <https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html> |
| `MOD` | <https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html> |
| `TSC:<name>` | <https://www.typescriptlang.org/tsconfig/#><name> |
| `REL:<version>` | 4.9: <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html>; 6.0: <https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/>; 7.0: <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/> |
| `DG` | <https://github.com/microsoft/TypeScript/wiki/TypeScript-Design-Goals> |
| `PERF` | <https://github.com/microsoft/TypeScript/wiki/Performance> |
| `G:<section>` | Google TypeScript Style Guide <https://google.github.io/styleguide/tsguide.html>; `<section>` is the section heading as lowercase words joined by `-`, dropping backticks, `\|`, `/`, `<`, and `>` |
| `TSE:<rule>` | <https://typescript-eslint.io/rules/><rule>/; `TSE:configs` <https://typescript-eslint.io/users/configs/>; `TSE:typed-linting` <https://typescript-eslint.io/getting-started/typed-linting/> |
| `ET<n>` | *Effective TypeScript*, 2nd ed. (Dan Vanderkam, O'Reilly, 2024), item n; titles at <https://github.com/danvk/effective-typescript> |
| `BUN:<path>` | <https://bun.com/docs/><path> |
| `NODE` | <https://nodejs.org/api/typescript.html> |
| `BIOME:<path>` | <https://biomejs.dev/><path>/ |
| `OMP:<doc>` | omp://<doc>.md (OMP 18.3.1) |
| `U` | user decisions and environment, observed 2026-09-29: ~/.omp/agent/AGENTS.md, ~/.omp/agent/CONTRIBUTING.md § Extensions, § Conflicts resolved, local tool inventory |

## Snapshot

- TypeScript: `typescript` 7.0.2 is npm `latest`; 7.0 (2026-07-08) is the native Go port, ships `tsc`, has no programmatic API (7.1 expected to add one), and hard-errors the 6.0 deprecations; 6.0 (2026-03-23) was the bridge release; `@typescript/native-preview` (`tsgo`, 7.0.0-dev.20260707.2) was the preview, and nightlies move to `typescript@next`.
- 6.0 and 7.0 defaults: `strict: true`, `module: esnext`, `target` the latest stable ECMAScript version, `noUncheckedSideEffectImports: true`, `libReplacement: false`, `types: []`, `rootDir: ./`; 7.0 adds `stableTypeOrdering: true`, which cannot be disabled.
- Lint and format: typescript-eslint 8.71.0 with ESLint 10.11.0 (`strict` and `strict-type-checked` may change outside majors); Biome 2.5.14 (type-aware rules through its own inference, several nursery); oxlint 1.86.0 (type-aware through `oxlint-tsgolint`).
- Runtimes: Bun 1.4.2 and `@types/bun` 1.4.2; Bun transpiles without type-checking. Node type stripping: default since 22.18.0 and 23.6.0, stable since 24.12.0 and 25.2.0; `--experimental-transform-types` removed in 26.0.0.
- Local toolchain (2026-09-29): `tsc` 7.0.2 (Bun global), Biome 2.5.14 and Bun 1.4.2 (Scoop), Node 24.21.0; no ESLint, oxlint, Prettier, `tsgo`, Deno, or `typescript-language-server` on PATH.

## Conflicts resolved

- Source order: Handbook and TSConfig reference > typescript-eslint > Google > Effective TypeScript. Google states its advice may not apply outside Google; the TypeScript wiki's "Coding guidelines" page is for compiler contributors and is not encoded.
- Enums, runtime namespaces, parameter properties, `import =` aliases: banned (user, 2026-09-29: erasable syntax only), over Google's "use `enum`" and its parameter-property guidance; literal unions, `as const` objects, and explicit fields instead.
- Default exports: Google's ban kept; OMP extension entries keep `export default function` (CONTRIBUTING.md § Extensions).
- Private members: TypeScript `private`/`protected` modifiers (Google, house code); `#private` only when runtime privacy matters.
- `interface` vs `type` for object shapes: `interface` (Google, PERF, ET13); repos whose files already use `type` aliases for shapes, such as the OMP extensions, keep their convention.
- Arrays: Google's split (`T[]` for simple element types, `Array<T>` for complex ones) over one uniform syntax.
- `null` vs `undefined`: Google sets no preference → `undefined` through optional members; `null` only for external APIs and JSON (ET32, ET33).
- `@ts-expect-error`: Google allows it only in tests and typescript-eslint allows it with a description → only with a plan-approved reason, or in type tests.
- File names: Google's `snake_case` → `kebab-case` (house repos).
- Quotes, semicolons, and line width: formatter-owned (Biome or repo config), not Google's single-quote rule.
- Return types: Google leaves them to the author → exported functions and methods declare them (user standards, `isolatedDeclarations`, PERF).
- Strictness beyond `strict`: Bun's recommended set plus `erasableSyntaxOnly` and `noImplicitReturns`; `exactOptionalPropertyTypes` and `noPropertyAccessFromIndexSignature` stay opt-in.
- Lint: Biome by default (installed, and the quality gate runs it); repos already on ESLint use typescript-eslint `strictTypeChecked` plus `stylisticTypeChecked`; no new linter without approval.
