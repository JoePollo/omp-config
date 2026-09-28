---
description: "AGENTS.md: no new comments unless absolutely required (// languages)"
condition:
  - '(?m)^[ \t]*//(?![/!])(?![ \t]*(?:@ts-|eslint-|biome-ignore|#region|#endregion))'
  - '(?m)^[ \t]*/\*(?!\*)'
  - '(?m)[;{}()\]][ \t]+//[ \t]'
scope: "tool:edit(*.{ts,tsx,js,jsx,mjs,cjs,tf}), tool:write(*.{ts,tsx,js,jsx,mjs,cjs,tf})"
interruptMode: tool-only
---

AGENTS.md: inline comments only when absolutely required; if code needs a comment to explain what it does, rename or restructure it instead.

- Keep existing comments you did not write; this rule targets comments you add.
- Allowed: shebangs, encoding lines, license headers the repo requires, docstrings, notebook cell markers, and tool directives the repo already uses.
- A comment is justified only for a non-obvious why (external constraint, linked workaround), never a what.
