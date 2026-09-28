---
description: "AGENTS.md: no new comments unless absolutely required (# languages)"
condition:
  - '(?m)^[ \t]*#(?!!)(?![ \t]*(?:-\*-|type:|noqa|pragma|fmt:|ruff:|pyright:|mypy:|region\b|endregion\b|Databricks notebook source|COMMAND|MAGIC))'
  - '(?m)\S[ \t]{2,}#[ \t]'
scope: "tool:edit(*.{py,pyi,ps1,psm1,sh,tf,tfvars}), tool:write(*.{py,pyi,ps1,psm1,sh,tf,tfvars})"
interruptMode: tool-only
---

AGENTS.md: inline comments only when absolutely required; if code needs a comment to explain what it does, rename or restructure it instead.

- Keep existing comments you did not write; this rule targets comments you add.
- Allowed: shebangs, encoding lines, license headers the repo requires, docstrings, notebook cell markers, and tool directives the repo already uses.
- A comment is justified only for a non-obvious why (external constraint, linked workaround), never a what.
