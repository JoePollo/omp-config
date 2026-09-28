---
description: "AGENTS.md: no new comments unless absolutely required (SQL)"
condition:
  - '(?m)^[ \t]*--(?![ \t]*(?:sqlfluff:|noqa|Databricks notebook source|COMMAND|MAGIC))'
  - '(?m)\S[ \t]+--[ \t]'
  - '(?m)^[ \t]*/\*'
scope: "tool:edit(*.sql), tool:write(*.sql)"
interruptMode: tool-only
---

AGENTS.md: inline comments only when absolutely required; if code needs a comment to explain what it does, rename or restructure it instead.

- Keep existing comments you did not write; this rule targets comments you add.
- Allowed: shebangs, encoding lines, license headers the repo requires, docstrings, notebook cell markers, and tool directives the repo already uses.
- A comment is justified only for a non-obvious why (external constraint, linked workaround), never a what.
