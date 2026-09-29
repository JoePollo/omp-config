# TypeScript types

Tags → skill://typescript/sources.md.

## Boundaries

- Parse untyped input to `unknown` and validate it before use: `JSON.parse`, `response.json()`, env, argv, files, tool args. [DG, ET46, ET74]
- Validate with the repo's schema library (OMP extensions: `pi.arktype`); none → a type guard that checks every field the type relies on; adding a library is a new dependency. [U]
- Never `JSON.parse(text) as T`, `(await response.json()) as T`, or `const value: T = JSON.parse(text)`. [TSE:no-unsafe-assignment, ET9, ET46]
- An unavoidable assertion lives inside one small, well-typed function beside the check that justifies it. [ET45]
- `any` never spreads: narrowest scope, precise variants (`unknown[]`, `Record<string, unknown>`). [ET43, ET44]
- Accept broad inputs; return precise outputs. [ET30]

## Narrowing

- Narrow unions with `typeof`, `instanceof`, `in`, equality, or a literal discriminant before using constituent members. [H:2/narrowing, ET22]
- `in` narrowing keeps types with that optional property in both branches; prefer a discriminant. [H:2/narrowing]
- Type guards (`function isUser(value: unknown): value is User`) check everything the type promises. [H:2/narrowing, ET45]
- Exhaustive `switch`: `default` assigns the value to a `never` variable and throws. [H:2/narrowing, ET59]
- Special values get distinct types, not sentinels such as `-1` or `""`. [ET36]

## Design

- Types admit only valid states: unions of interfaces over interfaces full of optional fields. [ET29, ET34, ET37]
- Push `null` and `undefined` to the perimeter: the whole object is optional, not each field. [ET33]
- Precise over `string`: literal unions, template literal types for patterns, brands for IDs and units. [ET35, ET54, ET64]
- Imprecise but correct beats precise but wrong; names come from the problem domain, not from sample data. [ET40, ET41, ET42]
- Two adjacent parameters of the same type become an options object. [ET38]
- `Record<Key, V>` over a key union keeps objects in sync with the union. [ET61]
- Index signatures only for truly dynamic keys, never numeric ones; under `noUncheckedIndexedAccess` handle `undefined` instead of asserting. [ET16, ET17, TSC:noUncheckedIndexedAccess]
- Excess-property errors on object literals are bugs: fix the target type, never bypass the check. [H:2/objects, ET11]
- `readonly` is compile-time and shallow, never runtime immutability. [H:2/objects]
- `satisfies` checks a literal while keeping its narrow inferred type. [REL:4.9]
- Tuples only for short positional pairs; named properties otherwise. [G:tuple-types]
- Name complex reusable types; prefer a shared base interface to a very large union. [PERF]

## Generics

- A type parameter relates two or more values; used once, it becomes its constraint. [H:2/functions, ET51]
- Push type parameters down, use as few as possible, never leave one unused, and never make one appear only in the return type. [H:2/functions, DD, G:return-type-only-generics]
- Conditional and mapped types only when simpler forms fail; a little repetition beats a clever type. [G:mapped-and-conditional-types, ET58]
- Control union distribution in conditional types deliberately (`[T] extends [U]`); prefer tail-recursive types. [ET53, ET57]
- Test non-trivial types with compile-time assertions; `@ts-expect-error` is allowed in those type tests. [ET55, G:@ts-ignore]

## Functions and overloads

- Union parameters over overloads; a conditional return type when the output follows the input. [H:2/functions, ET52]
- Overloads run from specific to general; optional trailing parameters replace arity-only overloads. [DD]
- `void` for callback results the caller ignores; `never` for functions that always throw. [H:2/functions, DD]
- Callable parameters get full signatures, never `Function`. [H:2/functions]
- Type whole function expressions (`const onSave: SaveHandler = …`); variadic functions take rest tuples; mutually exclusive options use optional `never` members. [ET12, ET62, ET63]
