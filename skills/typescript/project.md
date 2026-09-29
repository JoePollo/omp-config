# TypeScript project configuration

Tags → skill://typescript/sources.md.

## Versions

- TypeScript 7 is the native (Go) compiler, shipped as `typescript` with `tsc`; 6.0 was the bridge release; `@typescript/native-preview` (`tsgo`) was the preview. [REL:7.0, REL:6.0]
- TypeScript 7.0 has no programmatic API (7.1 is expected to add one): tools built on the API, such as typescript-eslint typed linting, may still need `typescript@6` beside it. [REL:7.0]
- Deprecated or unsupported since 6.0 and errors in 7.0: `target: es5`, `downlevelIteration`, `moduleResolution` `node`/`node10`, `module` `amd`/`umd`/`systemjs`/`none`, `baseUrl` lookups, `esModuleInterop: false`, `allowSyntheticDefaultImports: false`, `alwaysStrict: false`, `module Foo {}` namespace syntax, import assertions (`assert { … }` → `with { … }`); removed outright: `moduleResolution: classic`, `outFile`. [REL:6.0, REL:7.0]
- Files named on the command line beside a `tsconfig.json` are an error unless `--ignoreConfig` is passed. [REL:6.0]
- Upgrades fix deprecations; `ignoreDeprecations: "6.0"` only as a planned, temporary 6.x step. [REL:6.0]

## tsconfig

- Existing repos keep their `tsconfig`; propose stricter flags, never apply them unasked. [U]
- New Bun project: Bun's recommended options (`lib` and `target` `ESNext`, `module: "Preserve"`, `moduleResolution: "bundler"`, `moduleDetection: "force"`, `types: ["bun"]`, `allowImportingTsExtensions`, `verbatimModuleSyntax`, `noEmit`, `strict`, `skipLibCheck`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `noImplicitOverride`) plus `erasableSyntaxOnly` and `noImplicitReturns`. [BUN:runtime/typescript, TSC:erasableSyntaxOnly, TSC:noImplicitReturns, U]
- Node running `.ts` directly: `erasableSyntaxOnly`, `verbatimModuleSyntax`, `module` and `moduleResolution` `nodenext`, relative imports with `.ts` extensions (`allowImportingTsExtensions` plus `noEmit`, or `rewriteRelativeImportExtensions` when emitting). [NODE, MOD, TSC:allowImportingTsExtensions, TSC:rewriteRelativeImportExtensions]
- Bundled apps: `module` `preserve` or `esnext` with `moduleResolution: "bundler"`; never `bundler` for libraries that must also run in Node. [TSC:module, TSC:moduleResolution, MOD]
- `types` lists every ambient package (`["bun"]`, `["node"]`); since 6.0 none load by default. [TSC:types, REL:6.0]
- `lib` matches the runtime: no `DOM` in server code. [TSC:lib]
- `exactOptionalPropertyTypes` when presence and `undefined` differ; `noPropertyAccessFromIndexSignature` is optional. [TSC:exactOptionalPropertyTypes, TSC:noPropertyAccessFromIndexSignature]
- `skipLibCheck: true` trades `.d.ts` checking for speed; fix duplicate dependency types instead of hiding them. [TSC:skipLibCheck]
- `noEmit` when Bun, Node, or a bundler runs the code, so `tsc` only checks. [TSC:noEmit]
- Environments with different globals (app, tests, scripts) get separate configs joined by project references; large codebases split into references. [MOD, PERF]

## package.json

- `"type": "module"`; scripts `typecheck` (`tsc --noEmit`), `lint`, and `test`. [NODE, U]
- `typescript`, `@types/*`, and tools go in `devDependencies`; every new package needs user approval (AGENTS.md). [ET65, U]

## Lint and format

- Biome by default: installed, and the quality gate runs `biome lint` (`--write` applies safe fixes only); a repo `biome.json` wins. [BIOME:linter, U]
- Biome's type-aware rules (`types` domain: `noFloatingPromises`, `noMisusedPromises`, `useExhaustiveSwitchCases`) use its own inference; several are nursery. [BIOME:linter/domains]
- Repos already on ESLint: flat config with `tseslint.configs.strictTypeChecked` and `stylisticTypeChecked` and `parserOptions.projectService: true`; pin `typescript-eslint`, because `strict` presets change outside majors. [TSE:configs, TSE:typed-linting]
- Worth enabling beyond the presets: `switch-exhaustiveness-check`, `consistent-type-imports`, `prefer-readonly`. [TSE:switch-exhaustiveness-check, TSE:consistent-type-imports, TSE:prefer-readonly]
- Never add ESLint, Prettier, or oxlint to a repo without approval. [U]
