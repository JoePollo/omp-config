# TypeScript async

Tags → skill://typescript/sources.md.

## Promises

- Every promise is awaited, returned, or handled with `.catch`; deliberate fire-and-forget is spelled `void task().catch(report)`. [TSE:no-floating-promises]
- No async function where a `void` callback is expected (`forEach`, event emitters, `setTimeout`, array predicates): loop with `for...of` and `await`, or handle the promise inside. [TSE:no-misused-promises]
- `await` only thenables; `async` only on functions that await or must return a promise. [TSE:await-thenable, TSE:require-await]
- Inside `try`, `catch`, or `finally`, `return await`; elsewhere return the promise itself. [TSE:return-await]
- `async`/`await` over callbacks and `.then` chains. [ET27]
- Independent work runs through `Promise.all` or `Promise.allSettled`, not sequential awaits in a loop. [U]
- A promise you settle by hand comes from `Promise.withResolvers()`, not `new Promise(…)`. [U]

## Failure and time

- Reject only with `Error` instances. [TSE:only-throw-error, G:only-throw-errors]
- Entry points catch rejections and report them; never leave one unhandled. [TSE:no-floating-promises]
- I/O that can hang takes an `AbortSignal` or a timeout, e.g. `fetch(url, { signal: AbortSignal.timeout(ms) })`. [U]
- Clear every timer you start; `clearTimeout` accepts `undefined`, so no guard. [U]
- Tests drive time with fake timers, never real sleeps. [U]
