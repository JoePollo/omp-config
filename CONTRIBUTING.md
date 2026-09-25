# Contributing to ~/.omp/agent

Applies to every create, edit, delete, or rename under `~/.omp/agent`, the OMP user agent dir that every session loads. Precedence: explicit user instruction > `AGENTS.md` > this guide. Harness facts come from `omp://<doc>.md`; when a doc and this guide disagree, the doc wins and this guide is corrected in the same change. Keep every `@` in this file inside a code span: `.omp/AGENTS.md` imports this file, and a bare `@path` token expands.

## Map

| path | role | rule |
|---|---|---|
| `AGENTS.md` | user context: every session, every cwd | edit only on explicit request; § Context files |
| `.omp/AGENTS.md` | project context for sessions started in this dir or below | exactly one line: `@../CONTRIBUTING.md` |
| `CONTRIBUTING.md` | this guide | update in the same change as any convention it states |
| `config.yml` | global settings layer | edit only on explicit request; § Settings |
| `mcp.json` | user MCP servers; machine-specific; gitignored | edit only on explicit request; § Settings |
| `.gitignore` | keeps runtime state, `mcp.json`, `.env*` out of git | a new runtime artifact gets its pattern in the same change |
| `rules/domain-router.md` | always-apply KB router | § Router |
| `rules/<prefix><topic>.md` | TTSR rules | § TTSR rules |
| `skills/<pack>/` | hidden domain KB packs | § Skills |
| `agents/<name>.md` | task agents | § Agents |
| `extensions/<name>.ts` | extensions loaded at startup | § Extensions |
| `managed-skills/` | auto-learn skills; appears on first write | written only by `manage_skill`/`learn`; a same-name `skills/` pack shadows it |
| `sessions/` `terminal-sessions/` `blobs/` `cache/` `memories/` `custom-session-files/` `*.db*` `kimi-device-id` `last-changelog-version` | OMP runtime state | never edit or commit |

Recognized by OMP but absent here; create only on explicit request, after reading the named doc: `RULES.md` (sticky rule on every request; omp://context-files.md), `SYSTEM.md` `SYSTEM_TEMPLATE.md` `APPEND_SYSTEM.md` `TITLE_SYSTEM.md` `PERSONALITY.md` (omp://system-prompt-customization.md), `models.yml` (omp://models.md), `secrets.yml` (omp://secrets.md), `keybindings.yml` (omp://keybindings.md), `.env` (omp://environment-variables.md), `commands/` `prompts/` `instructions/` `hooks/pre|post/` `tools/` (omp://config-usage.md).

## Workflow

1. Gate: plan mode + user approval before any change. Outside this workflow: OMP-owned writes (runtime state; `manage_skill`/`learn` into `managed-skills/`). Sole agent exception, a trivial fix: a typo or wording change inside one existing file that alters no meaning, name, path, trigger, regex, frontmatter, schema, or behavior; make it directly and name it in the reply.
2. Preflight, while planning:
   - Read each file the change touches, its section here, and its `omp://` doc.
   - New names are unique: `glob` `skills/*/SKILL.md`, `rules/*.md`, `agents/*.md`, `extensions/*.ts`; check `omp ttsr list` (includes `[builtin-defaults]` rules); `omp read skill://<name>` fails before the pack exists; no agent in the task tool's agent list (bundled included) has the name unless overriding it is the approved goal.
   - Couplings: `grep` every name, field, or path being renamed or removed across `AGENTS.md`, `CONTRIBUTING.md`, `rules/`, `skills/`, `agents/`, `extensions/`; the plan updates every hit.
   - The plan holds the full content of every new file and the exact edit for every changed one.
3. Implement:
   - Copy planned content byte-for-byte.
   - `rules/domain-router.md`, `AGENTS.md`, `config.yml`: re-read right before editing; change only the planned row or line; keep frontmatter, headers, and every other row.
   - Clean cutover: a rename or removal updates every reference in the same change; no aliases.
4. Verify:
   - Run every check listed in the artifact's section.
   - Compare each copied regex and frontmatter line with the plan byte-for-byte.
   - OMP discovers these files at session start, so check with a fresh process (`omp -p --no-session …`), never the implementing session.
5. Report: changed files, each check with its observed result, and anything unverified with the reason.

Disposable fixtures (a repo to exercise an agent or extension) live in `~/src/<slug>-smoke/`, never inside this dir, and are deleted after verification; `git init` or commits there only when the approved plan says so.

## Context files

- `AGENTS.md` loads into every session: cross-domain user standards only, terse. Domain rules go to a skill pack; detectable anti-patterns to a TTSR rule.
- `.omp/AGENTS.md` stays the single import line, and `.omp/` holds nothing else; agent-dir guidance goes in this guide.
- Context files expand a bare `@path` token (relative to the file, up to 5 hops); code spans and fenced blocks stay literal.
- Verify after editing this guide or `.omp/AGENTS.md`: `omp -p --no-session --no-tools --cwd ~/.omp/agent "If your context holds a file whose path ends in .omp/AGENTS.md, reply with only its first Markdown H1 line; else reply NONE."` → `# Contributing to ~/.omp/agent`.

## Settings

- `config.yml`: every changed key resolves: `omp config get <key>` exits 0 and prints the new value; `Unknown setting: <key>` (exit 1) means a wrong path. Semantics: omp://settings.md. Arrays replace, not merge, across settings layers.
- `modelRoles` names are referenced by agents (`"@judge"`, `"@smol"`): rename or remove a role only together with every agent that uses it.
- Invalid YAML makes OMP quarantine the file to a `.broken-*` sibling and fail startup; fix and restore it at once.
- `mcp.json`: `mcpServers` map (omp://mcp-config.md). Credentials only as `${VAR}`, `${VAR:-default}`, `!command`, or OAuth, never literal. Verify with the user-run `/mcp list` and `/mcp test <name>`; there is no CLI equivalent.

## Skills

- Layout: `skills/<pack>/SKILL.md` (index), `<topic>.md` files, and `sources.md`. One level only; nested dirs are not discovered. `<pack>` is kebab-case and equals the frontmatter `name` and the router `domain`.
- `SKILL.md` frontmatter, exactly:

```yaml
---
name: <pack>
description: <Domain> knowledge base (<scope, comma-separated>). Routed by rule://domain-router.
hide: true
---
```

- `hide: true` keeps the pack out of the prompt's skill list, so the router is its only entry. A pack without `description` is skipped.
- `SKILL.md` body, in order: `# <Domain> KB`; the line `Defaults only: explicit instructions, AGENTS.md, repo config/conventions win. Read every topic whose trigger matches. Tags → skill://<pack>/sources.md.`; a `## Topics` table `| trigger | read |` whose read cells are `skill://<pack>/<topic>.md`; domain sections, `## Core` first; optional `## Diagnose (read-only)` and `## Local platform (observed <YYYY-MM-DD>; repo config wins)`.
- Topic file: no frontmatter; line 1 `# <Title>`; line 2 `Tags → skill://<pack>/sources.md.`; `##` sections of bullets; lowercase kebab-case filename.
- `sources.md`: `# <Domain> KB sources`; line 2 `Verified <YYYY-MM-DD> against <sources>. Re-verify on <upgrade triggers>.`; a `| tag | source |` table (tag families such as `P<n>`, `HC:<path>`); `## Snapshot` (observed versions); `## Conflicts resolved`; optional `## Open (ask user when first needed)`.
- Bullets: one rule each; lowercase imperatives (`never`, `use`, `no`); identifiers in code spans; each ends with source tags (`[P8, U]`) that resolve in `sources.md`. Tables for comparisons; no tutorials.
- Size: `SKILL.md` ≤ 140 lines, topics ≤ 80 (current maxima 138 and 76); split a topic rather than exceed.
- Defer to the owning pack instead of duplicating (airflow links `skill://python` for Python style).
- A pack without topics (`coding-entropy`) is one `SKILL.md` ending in `## Sources`.
- Adding a pack = pack + router row (§ Router) in one change; removing one = its dir, router row, and prefixed rules together.
- Verify: `omp read skill://<pack>`, then `omp read skill://<pack>/<file>` for every index target and `sources.md`, each returning content, never `File not found`; every tag family used has a `sources.md` row.

## Router

- `rules/domain-router.md`: frontmatter `alwaysApply: true` and the directive line stay unchanged. One row per pack, appended after the last row: `| <pack> | <triggers> | skill://<pack> |`.
- Triggers: file globs first, space-separated, if any; then `; ` and comma-separated topic keywords; then optional `Skip: <exclusions>`. Models: python row (globs only), airflow row (globs + keywords), databricks-silver-modeling row (keywords + Skip). The router rides in every session, so list only what selects the pack.
- The model applies routing; the harness enforces nothing. Standalone `omp read rule://domain-router` returns `Unknown rule` with `Available: none` (the CLI has no rules loaded); that is not a failure.
- Verify: `omp -p --no-session --no-tools "Per the domain router in your context, which skill:// URI covers <trigger>? Reply with only the URI."` → `skill://<pack>`.

## TTSR rules

- Use for one mechanically detectable anti-pattern in edit/write content or bash commands that enforces a rule its pack already states. Guidance without a regex signal stays in the pack.
- File: `rules/<prefix><topic>.md`, kebab-case, prefix per pack:

| prefix | pack |
|---|---|
| `af-` | airflow |
| `tf-` | terraform |
| `py-` | python |
| `dbp-` | databricks-platform |
| `dbx-silver-` | databricks-silver-modeling |

- A new pack gets a new prefix that is not equal to, a prefix of, or prefixed by any of these or the builtin `go-`, `rs-`, `ts-` (a same-name user rule shadows a builtin); add it to this table. `domain-router` is the only unprefixed rule. Never create `rules/RULES.md`: it shadows the sticky `RULES.md`.
- Frontmatter, in this key order:

```yaml
---
description: "<one-line imperative>"
condition:
  - '<regex>'
scope: "tool:edit(<glob>), tool:write(<glob>)"
interruptMode: never
---
```

- `condition`: single-quoted JS regexes, one alternative per item; write a literal `'` as `''`; flags only as a leading `(?i)`, `(?m)`, or `(?s)`; `\b` word bounds; anchor with `(?m)^` only when line-sensitive. An invalid regex drops the rule with only a startup warning.
- `scope`: one quoted string of `tool:edit(<glob>), tool:write(<glob>)` pairs (basename `*.py`, path `**/dags/**/*.py`, braces `*.{sql,py}`) or `tool:bash`. Bash rules match the tool-call JSON (`{"command":"…"}`), not the bare command.
- `interruptMode`: `never`, so the reminder rides the tool result; `tool-only` only when the call itself must not run (`tf-live-state-cli`).
- `globs`, `astCondition`, `question` (a judge-model call per output), `agents`, `alwaysApply`: unused here; add only with a reason stated in the plan (omp://rulebook-matching-pipeline.md).
- Body: line 1 is the why; then an `| avoid | use |` table or `## Avoid` / `## Use` fenced examples; `Details: skill://<pack>/<topic>.md.`; optional `Exception: <when>`.
- Verify, cwd `~/.omp/agent`:
  - Positive, one per `condition` item: `omp ttsr test --rule rules/<file>.md --source tool --tool edit --path <in-scope path> '<violating snippet>'` → `Triggered (1)`, exit 0.
  - Negative (compliant rewrite) and out-of-scope (a `--path` the scope excludes) → `No rules triggered.`, exit 1.
  - Bash rules: `write` the JSON snippet to `local://<name>.txt`, get its path with `realpath local://<name>.txt`, and pass `--source tool --tool bash --file <path>`. An inline snippet trips the rule on your own bash call, and `omp` does not resolve `local://`.
  - Registration: `omp ttsr list` shows `<name> [native]` with the planned condition and scope.
  - False positives: `omp ttsr scan -r rules/<file>.md <repo under ~/src> --verbose` → every hit is a real violation.

## Agents

- File `agents/<name>.md`; `name` is the file stem, kebab-case. `name` and `description` are required; a file missing either is skipped with a warning. Key order: `name`, `description`, `model`, `thinking-level`, `blocking`, `read-summarize`, `tools`, `spawns`, `output`.
- `model`: a quoted role alias from `config.yml` `modelRoles` (`"@judge"`, `"@smol"`), never a model id.
- `tools`: only what the prompt uses; agents that judge or report get no `edit` or `write`.
- `output`: a JSON schema with `additionalProperties: false` and complete `required` lists at every level.
- Body: `## Inputs`, numbered step sections, `## Report`.
- Names match exactly and first wins, so a file here replaces the bundled agent of the same name. Never run `omp agents unpack` into this dir: the copies would shadow the bundled agents and freeze them against updates.
- Coupled to `extensions/quality-gate.ts`: agent names `quality-gate`, `entropy-review`, `code-review`; gate `status` values `pass|findings|blocked|skipped`; reviewer `status` and `findings[].id|file|line|rule`; the `review_verdict` agent enum. Change these only together with `quality-gate.ts`.
- Verify: `omp -p --no-session --tools task "Without calling any tool, list the agent names your task tool offers, one per line."` includes `<name>`; one task on a disposable fixture returns output that fits the schema.

## Extensions

- File `extensions/<name>.ts`: `export default function <camelName>(pi: ExtensionAPI)`, returning `void` or a promise. Imports: `node:*` builtins and `import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent"`; schemas via `pi.arktype`. No other packages (`AGENTS.md` dependency rule).
- Helpers go in a subdir without `index.ts` (e.g., `extensions/lib/`), imported as `./lib/<file>.ts`. A top-level helper is loaded as an extension and fails (omp://extension-loading.md).
- Persisted entry and message types: `jpollock.<extension>.<entry>`. Registered tools: snake_case and unique in the tool list.
- Extensions load once at OMP startup, so edits apply after a restart. Load errors go to `~/.omp/logs/omp.<date>.<pid>.log`.
- There is no typecheck or lint config and no quality-gate group for `.ts`; the builtin `ts-*` TTSR rules fire on `.ts` edits.
- Verify: run `omp -p --no-session --no-tools "Reply OK."`; the newest `~/.omp/logs/omp.*.log` shows no load error naming `<name>.ts`; exercise each event path on a disposable fixture.
