---
name: coding-entropy
description: "Do/don't rules against needless indirection in code bound for a commit. Read via domain-router when writing, editing, planning, or reviewing such code; never for ad hoc scripts."
hide: true
---
# Coding entropy

Entropy: structure that raises the cost to understand or change code without adding behavior or hiding complexity [O][U]. Not Shannon or cryptographic entropy.

## Gate
- Apply: code bound for a commit, any language: new/edited files in a git working tree, plans for them, reviews of diffs/PRs/commits.
- Skip: user calls it ad hoc, one-off, throwaway, scratch, spike, or exploratory; eval/REPL cells; shell one-liners; ad hoc queries; files in temp dirs, `local://`, or gitignored paths.
- Unclear: inside a git working tree → apply; else skip. Explicit user intent overrides.
- Conflicts: repo config > AGENTS.md > domain KB > this KB.

## Keep test
A new function, method, class, module, file, CTE, template, layer, parameter, or config key stays only if ≥1 holds; else inline or delete it:
- Deep: interface much simpler than the logic it hides [O].
- Single home for knowledge that ≥2 callers must change together [P].
- External caller: framework/runtime entrypoint or callback, test or fixture, interface implementation/override (incl. dunder), public API used outside the repo.
- Required by repo config, AGENTS.md, or a domain KB.

## Don't
- One-line body, one caller → inline [F1][O][U].
- Wrapper/delegate that only forwards → call the target directly [F3][O].
- Units that must be read together to be understood (entangled) → merge; reordering doesn't fix it [O].
- Extracting lookalike code that encodes different knowledge → keep separate; same code ≠ same knowledge [P].
- Shared abstraction grown per-caller params/flags/branches → inline into each caller, delete unused branches, re-extract only true commonality [M].
- Params, flags, hooks, config, base classes, or interfaces for callers that don't exist → delete [U].
- Variable that only aliases an expression → inline [F4].
- Comment explaining what code does → rename/restructure; AGENTS.md comment rule governs [P].
- Do not split merely to meet a line-count target [O]; when the McCabe ≤ 5 ceiling requires splitting [U], use a cohesive boundary [O].
- Dead code, unused params/imports, commented-out code, compat aliases/shims → delete [U].

## Do
- Name an expression with an explaining variable, not a helper function [F2].
- Keep closely related steps in one unit [O].
- Procedural functions and methods in any language have McCabe cyclomatic complexity ≤ 5 [U]. When reducing complexity, use a cohesive boundary; if extracting, use one deep chunk, not one-liners [O].
- Rename/move → update every caller in the same change; no alias or re-export [U].
- Consolidate first-draft structure before commit; unpaid draft structure is debt [C].
- Add zero new entropy in touched code; leave stable untouched code alone [T].

## Instances
- Python: `def _is_active(u): return u.status == "active"` with one call → `is_active = user.status == "active"`.
- SQL: CTE that only does `SELECT *` or renames columns from one source, referenced once → query the source.
- Terraform: module wrapping one resource, name ≈ resource type → use the resource [H].
- Azure Pipelines: template holding one step with pass-through parameters, used once → inline the step.

## Review
- Per new unit in the diff: count callers (LSP references; grep where no LSP), compare interface to body, confirm it reads alone [O].
- Finding = location + rule + concrete fix, e.g. `inline _is_active into load_users`.
- New entropy in the diff → finding; pre-existing entropy in touched lines → suggestion; untouched code → no comment [T].

## Sources
- [O] Ousterhout & Martin, "A Philosophy of Software Design vs Clean Code": https://github.com/johnousterhout/aposd-vs-clean-code
- [F1] Fowler, Inline Function: https://refactoring.com/catalog/inlineFunction.html
- [F2] Fowler, Extract Variable: https://refactoring.com/catalog/extractVariable.html
- [F3] Fowler, Remove Middle Man: https://refactoring.com/catalog/removeMiddleMan.html
- [F4] Fowler, Inline Variable: https://refactoring.com/catalog/inlineVariable.html
- [P] Thomas & Hunt, The Pragmatic Programmer 20th Anniv. Ed., "DRY—The Evils of Duplication": https://media.pragprog.com/titles/tpp20/dry.pdf
- [M] Metz, "The Wrong Abstraction": https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction
- [T] Fowler, "Technical Debt": https://martinfowler.com/bliki/TechnicalDebt.html
- [C] Cunningham, "The WyCash Portfolio Management System" (OOPSLA '92): http://c2.com/doc/oopsla92.html
- [H] HashiCorp, "Creating Modules" › "When to write a module": https://developer.hashicorp.com/terraform/language/modules/develop
- [U] User standards: procedural functions and methods have McCabe cyclomatic complexity ≤ 5 in any language; one-line, one-caller functions add maintenance and support burden, as also stated in ~/.omp/agent/AGENTS.md.
