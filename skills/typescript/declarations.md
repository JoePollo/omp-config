# TypeScript declarations and packages

Tags → skill://typescript/sources.md.

## Declaration files

- Primitive types, never `Number`, `String`, `Boolean`, `Symbol`, or `Object`; `object` for non-primitives. [DD]
- `unknown` for values of unknown type; `any` only while migrating JavaScript or for deliberately unsafe APIs. [DD]
- Callback results the caller ignores are `void`, not `any`. [DD]
- Callback parameters are optional only if callers may omit them; one callback overload with the maximum arity. [DD]
- Overloads run from specific to general; optional parameters replace trailing-arity overloads; unions replace overloads that differ in one parameter type. [DD]
- No unused generic type parameters. [DD]
- `declare global` and module augmentation (`declare module "pkg"`) only to describe or fix third-party code. [ET71, G:use-modules-not-namespaces]
- Never publish ambient `const enum`s. [H:enums]

## Packages

- `typescript` and `@types/*` belong in `devDependencies`. [ET65]
- Keep the package, its `@types`, and the TypeScript version compatible. [ET66]
- Export every type that appears in a public API. [ET67]
- Document public APIs with TSDoc (`/** … */`); docs never restate types. [ET68, ET31, G:jsdoc-type-annotations]
- Callbacks invoked with a meaningful `this` declare a `this` parameter. [ET69]
- Mirror the few types you need instead of depending on a heavy package for them. [ET70]
- Libraries: `verbatimModuleSyntax`; `module` and `moduleResolution` `nodenext` when output must run in Node; `target` is the lowest ECMAScript version supported. [MOD]
- Declaration emit: `isolatedDeclarations`, with explicit types on every export. [TSC:isolatedDeclarations]
