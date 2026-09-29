---
description: "Use primitive types and full signatures, not String, Number, Boolean, Object, or Function"
condition:
  - '(?:[:<|&,]\s*|\bas\s+)(?:String|Number|Boolean|Symbol|BigInt|Object|Function)\b(?!\s*[.(])'
  - '\bnew\s+(?:String|Number|Boolean)\s*\('
scope: "tool:edit(*.{ts,tsx,mts,cts}), tool:write(*.{ts,tsx,mts,cts})"
interruptMode: never
---

Boxed types accept wrapper objects and `Object` accepts almost anything; calling a `Function` returns `any`.

| avoid | use |
|---|---|
| `name: String`, `count: Number`, `flag: Boolean` | `string`, `number`, `boolean` |
| `value: Object` | `object`, `unknown`, or `Record<string, T>` |
| `callback: Function` | a signature such as `(event: Event) => void` |
| `new String("x")`, `new Number(1)`, `new Boolean(true)` | literals, or `String(x)`, `Number(x)`, `Boolean(x)` |

Details: skill://typescript.
