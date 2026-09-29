# TypeScript classes

Tags → skill://typescript/sources.md.

## When

- Module functions and object literals first; a class only when instances hold state behind methods. [G:container-classes, U]
- Never a static-only class as a namespace: export functions and constants. [G:container-classes]
- A private static helper becomes a module-local function. [G:avoid-private-static-methods]
- Structural contracts are interfaces, not classes. [G:use-structural-types]

## Members

- Declare fields explicitly and assign them in the constructor; no parameter properties (erasable syntax). [TSC:erasableSyntaxOnly, NODE, U]
- Initialize fields where declared; never add or delete properties after construction; a later-filled optional field starts as `undefined`. [G:field-initializers, ET21]
- `readonly` on fields never reassigned after construction. [G:use-readonly, TSE:prefer-readonly]
- Visibility through `private` and `protected` modifiers, never an explicit `public`; `#private` only when runtime privacy matters. [G:visibility, G:no-#private-fields, U]
- Members used outside the class's lexical scope are not `private`; never bypass visibility with `obj["member"]`. [G:properties-used-outside-of-class-lexical-scope]
- `override` on every overriding member (`noImplicitOverride`). [TSC:noImplicitOverride]
- Accessors only when non-trivial and free of side effects; never `Object.defineProperty` accessors. [G:getters-and-setters]
- Computed members only for symbols (`[Symbol.iterator]`). [G:computed-properties]

## Construction and `this`

- Always `new Foo()` with parentheses; omit empty or `super`-only constructors. [G:constructors]
- No `this` in static members; call statics on the class that defines them. [G:avoid-static-this-references, G:do-not-rely-on-dynamic-dispatch]
- Pass methods as arrows (`(event) => this.handle(event)`), never `.bind(this)`; handlers that must be removed are arrow-function properties. [G:arrow-functions-as-properties, G:event-handlers, G:rebinding-this]
- `toString` overrides always succeed and have no side effects. [G:overriding-tostring]
- No prototype manipulation or mixins. [G:do-not-manipulate-prototypes-directly]
- Decorators only where a framework requires them; Node type stripping rejects them. [G:decorators, NODE]
