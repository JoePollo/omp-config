# Contributing to ~/.omp/agent

Applies to every create, edit, delete, or rename under `~/.omp/agent`, the OMP
user agent dir that every session loads. Precedence: explicit user instruction >
`AGENTS.md` > this guide. Harness facts come from `omp://<doc>.md`; when a doc
and this guide disagree, the doc wins and this guide is corrected in the same
change. Keep every `@` in this file inside a code span: `.omp/AGENTS.md` imports
this file, and a bare `@path` token expands.

## Map

| path | role | rule |
|---|---|---|
| `AGENTS.md` | user context: every session, every cwd | edit only on explicit request; § Context files |
| `.omp/AGENTS.md` | project context for sessions started in this dir or below | exactly one line: `@../CONTRIBUTING.md` |
| `CONTRIBUTING.md` | this guide | update in the same change as any convention it states |
| `config.yml` | global settings layer | edit only on explicit request; § Settings |
| `mcp.json` | user MCP servers; machine-specific; gitignored | edit only on explicit request; § Settings |
| `mcp-catalog.json` | MCP tool read/write catalogue for `extensions/policy-guard.ts`; tracked | hand edits allowed; policy-guard adds tools and records prompt answers; § Extensions |
| `cli-catalog.json` | subcommand-CLI read/write catalogue for `extensions/policy-guard.ts`; tracked | hand edits allowed; policy-guard records resolved reads and prompt answers; § Extensions |
| `.gitignore` | keeps runtime state, `mcp.json`, `.env*` out of git | a new runtime artifact gets its pattern in the same change |
| `rules/domain-router.md` | always-apply KB router | § Router |
| `rules/<prefix><topic>.md` | TTSR rules | § TTSR rules |
| `skills/<pack>/` | hidden domain KB packs | § Skills |
| `agents/<name>.md` | task agents | § Agents |
| `extensions/<name>.ts` | extensions loaded at startup | § Extensions |
| `managed-skills/` | auto-learn skills; appears on first write | written only by `manage_skill`/`learn`; a same-name `skills/` pack shadows it |
| `sessions/` `terminal-sessions/` `blobs/` `cache/` `memories/` `custom-session-files/` `*.db*` `kimi-device-id` `last-changelog-version` | OMP runtime state | never edit or commit |

Recognized by OMP but absent here; create only on explicit request, after
reading the named doc: `RULES.md` (sticky rule on every request;
omp://context-files.md), `SYSTEM.md` `SYSTEM_TEMPLATE.md` `APPEND_SYSTEM.md`
`TITLE_SYSTEM.md` `PERSONALITY.md` (omp://system-prompt-customization.md),
`models.yml` (omp://models.md), `secrets.yml` (omp://secrets.md),
`keybindings.yml` (omp://keybindings.md), `.env`
(omp://environment-variables.md), `commands/` `prompts/` `instructions/`
`hooks/pre|post/` `tools/` (omp://config-usage.md).

## Workflow

1. Gate: plan mode + user approval before any change. Outside this workflow:
   OMP-owned writes (runtime state; `manage_skill`/`learn` into
   `managed-skills/`). Sole agent exception, a trivial fix: a typo or wording
   change inside one existing file that alters no meaning, name, path, trigger,
   regex, frontmatter, schema, or behavior; make it directly and name it in the
   reply.
2. Preflight, while planning:
   - Read each file the change touches, its section here, and its `omp://` doc.
   - New names are unique: `glob` `skills/*/SKILL.md`, `rules/*.md`,
     `agents/*.md`, `extensions/*.ts`; check `omp ttsr list` (includes
     `[builtin-defaults]` rules); `omp read skill://<name>` fails before the
     pack exists; no agent in the task tool's agent list (bundled included) has
     the name unless overriding it is the approved goal.
   - Couplings: `grep` every name, field, or path being renamed or removed
     across `AGENTS.md`, `CONTRIBUTING.md`, `rules/`, `skills/`, `agents/`,
     `extensions/`; the plan updates every hit.
   - The plan holds the full content of every new file and the exact edit for
     every changed one.
3. Implement:
   - Copy planned content byte-for-byte.
   - `rules/domain-router.md`, `AGENTS.md`, `config.yml`: re-read right before
     editing; change only the planned row or line; keep frontmatter, headers,
     and every other row.
   - Clean cutover: a rename or removal updates every reference in the same
     change; no aliases.
4. Verify:
   - Run every check listed in the artifact's section.
   - Compare each copied regex and frontmatter line with the plan byte-for-byte.
   - OMP discovers these files at session start, so check with a fresh process
     (`omp -p --no-session …`), never the implementing session.
5. Report: changed files, each check with its observed result, and anything
   unverified with the reason.

Disposable fixtures (a repo to exercise an agent or extension) live in
`~/src/<slug>-smoke/`, never inside this dir, and are deleted after
verification; `git init` or commits there only when the approved plan says so.

## Context files

- `AGENTS.md` loads into every session: cross-domain user standards only, terse.
  Domain rules go to a skill pack; detectable anti-patterns to a TTSR rule.
- `.omp/AGENTS.md` stays the single import line, and `.omp/` holds nothing else;
  agent-dir guidance goes in this guide.
- Context files expand a bare `@path` token (relative to the file, up to 5
  hops); code spans and fenced blocks stay literal.
- Verify after editing this guide or `.omp/AGENTS.md`: run
  `omp -p --no-session --no-tools --cwd ~/.omp/agent "<prompt>"` with `<prompt>`
  set to these spans joined by one space:
  `If your context holds a file whose path ends in .omp/AGENTS.md,`
  `reply with only its first Markdown H1 line; else reply NONE.` →
  `# Contributing to ~/.omp/agent`.

## Settings

- `config.yml`: every changed key resolves: `omp config get <key>` exits 0 and
  prints the new value; `Unknown setting: <key>` (exit 1) means a wrong path.
  Semantics: omp://settings.md. Arrays replace, not merge, across settings
  layers.
- `modelRoles` names are referenced by agents (`"@judge"`, `"@smol"`): rename or
  remove a role only together with every agent that uses it.
- Invalid YAML makes OMP quarantine the file to a `.broken-*` sibling and fail
  startup; fix and restore it at once.
- `mcp.json`: `mcpServers` map (omp://mcp-config.md). Credentials only as
  `${VAR}`, `${VAR:-default}`, `!command`, or OAuth, never literal. Verify with
  the user-run `/mcp list` and `/mcp test <name>`; there is no CLI equivalent.

## Skills

- Layout: `skills/<pack>/SKILL.md` (index), sibling `<topic>.md` files, and
  `sources.md`. One level only; nested skill directories are not discovered.
  `<pack>` is kebab-case and equals the frontmatter `name`; a deterministic KB
  has a `kb` mapping in that frontmatter.
- Required `SKILL.md` frontmatter (a KB may add the optional `kb` mapping after
  `hide`):

```yaml
---
name: <pack>
description: <Domain> knowledge base (<scope, comma-separated>). Routed by rule://domain-router.
hide: true
---
```

- `kb` is optional; when present it is the sole source of deterministic KB
  routing:
  - Allowed keys are `gate`, `files`, `roots`, `exclude`, `content`, `commands`,
    `mcp`, and `topics`. `gate` defaults to `files`; `commit-bound` cannot be
    combined with other keys.
  - `files`, `roots`, and `exclude` are lowercase repo-relative globs; a `roots`
    match is a project marker (e.g. `**/databricks.yml`), and every non-excluded
    file under its directory counts for the KB; `content` probes inspect at most
    the first 262,144 bytes of matched files; `commands` are regexes over parsed
    bash segments; `mcp` contains `mcp__` name prefixes.
  - Each topic names an existing sibling `.md` file and declares at least one
    `files`, `content`, or `commands` matcher.
  - Topics refine a KB and never add it: an area lists a topic only when the
    KB's own `files`, `roots`, or `content` rules count a file in that area, so
    those rules must cover every path a topic targets.
  - A skill is routed as a KB only when its `kb` mapping validates. The
    extension builds routing from this metadata; never hardcode domain names in
    extension code.
- `hide: true` hides a skill from the available-skills list but does not disable
  its `skill://` URL or deterministic JIT injection.
- `SKILL.md` body, in order: `# <Domain> KB`; the line formed by these spans
  joined by one space: `Defaults only: explicit instructions, AGENTS.md,`
  `repo config/conventions win.` `Read every topic whose trigger matches.`
  `Tags → skill://<pack>/sources.md.`; a `## Topics` table `| trigger | read |`
  whose read cells are `skill://<pack>/<topic>.md`; domain sections, `## Core`
  first; optional `## Diagnose (read-only)` and
  `## Local platform (observed <YYYY-MM-DD>; repo config wins)`.
- Topic file: no frontmatter; line 1 `# <Title>`; the first non-blank line after
  it is `Tags → skill://<pack>/sources.md.`; `##` sections of bullets; lowercase
  kebab-case filename.
- `sources.md`: `# <Domain> KB sources`; the first non-blank line after it is
  `Verified <YYYY-MM-DD> against <sources>. Re-verify on <upgrade triggers>.`; a
  `| tag | source |` table (tag families such as `P<n>`, `HC:<path>`);
  `## Snapshot` (observed versions); `## Conflicts resolved`; optional
  `## Open (ask user when first needed)`.
- Bullets: one rule each; lowercase imperatives (`never`, `use`, `no`);
  identifiers in code spans; each ends with source tags (`[P8, U]`) that resolve
  in `sources.md`. Tables for comparisons; no tutorials.
- Size: `SKILL.md` ≤ 140 lines, topics ≤ 80 (current maxima 138 and 76); split a
  topic rather than exceed.
- Defer to the owning pack instead of duplicating (airflow links
  `skill://python` for Python style).
- A pack without topics (`coding-entropy`) is one `SKILL.md` ending in
  `## Sources`.
- Adding a KB = pack + valid `kb` metadata. Removing one = remove the pack and
  its prefixed rules together.
- Verify: `omp read skill://<pack>`, then `omp read skill://<pack>/<file>` for
  every index target and `sources.md`, each returning content, never
  `File not found`; every tag family used has a `sources.md` row.

## Router

- `rules/domain-router.md` stays `alwaysApply: true` and carries the
  deterministic-router directive. Do not restore the legacy trigger/URL table.
- Each KB's `SKILL.md` `kb` mapping is the sole routing source for files,
  project roots, content, commands, MCP tools, topics, and commit-bound rules. A
  new KB does not require an extension-code/domain-union change.
- Agents consume the index through the extension: the orientation lists `./` and
  depth-1 areas, the `project_index` tool answers path queries, and `read` of
  `.omp/project-index.yaml` is blocked like writes.
- A `kb: <keys>.` span in a prompt, task prompts included, preloads each named
  KB index and each `<kb>/<topic>.md` topic file (`requestedKbKeys` in
  `extensions/domain-router.ts`); `extensions/quality-gate.ts` writes that span
  for `code-review` from the changed files' areas.
- Verify with a fresh OMP process in a disposable repo: inspect the generated
  index, catalog, and first-touch delivery; restart after extension or skill
  changes.

## TTSR rules

- Use for one mechanically detectable anti-pattern in edit/write content or bash
  commands that enforces a rule its pack already states. Guidance without a
  regex signal stays in the pack.
- File: `rules/<prefix><topic>.md`, kebab-case, prefix per pack:

| prefix | pack |
|---|---|
| `af-` | airflow |
| `tf-` | terraform |
| `py-` | python |
| `dbp-` | databricks-platform |
| `dbx-silver-` | databricks-silver-modeling |
| `dg-` | dagster |
| `sf-` | snowflake |
| `tsk-` | typescript |

- A new pack gets a new prefix that is not equal to, a prefix of, or prefixed by
  any of these or the builtin `go-`, `rs-`, `ts-` (a same-name user rule shadows
  a builtin); add it to this table. `domain-router` is the only unprefixed rule.
  Never create `rules/RULES.md`: it shadows the sticky `RULES.md`.
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

- `condition`: single-quoted JS regexes, one alternative per item; write a
  literal `'` as `''`; flags only as a leading `(?i)`, `(?m)`, or `(?s)`; `\b`
  word bounds; anchor with `(?m)^` only when line-sensitive. An invalid regex
  drops the rule with only a startup warning.
- `scope`: one quoted string of `tool:edit(<glob>), tool:write(<glob>)` pairs
  (basename `*.py`, path `**/dags/**/*.py`, braces `*.{sql,py}`) or `tool:bash`.
  Bash rules match the tool-call JSON (`{"command":"…"}`), not the bare command.
- `interruptMode`: `never`, so the reminder rides the tool result; `tool-only`
  only when the call itself must not run (`tf-live-state-cli`).
- `globs`, `astCondition`, `question` (a judge-model call per output), `agents`,
  `alwaysApply`: unused here; add only with a reason stated in the plan
  (omp://rulebook-matching-pipeline.md).
- Body: line 1 is the why; then an `| avoid | use |` table or `## Avoid` /
  `## Use` fenced examples; `Details: skill://<pack>/<topic>.md.`; optional
  `Exception: <when>`.
- Verify, cwd `~/.omp/agent`:
  - Positive, one per `condition` item:
    `omp ttsr test --rule rules/<file>.md --source tool --tool edit` followed by
    `--path <in-scope path> '<violating snippet>'` → `Triggered (1)`, exit 0.
  - Negative (compliant rewrite) and out-of-scope (a `--path` the scope
    excludes) → `No rules triggered.`, exit 1.
  - Bash rules: `write` the JSON snippet to `local://<name>.txt`, get its path
    with `realpath local://<name>.txt`, and pass
    `--source tool --tool bash --file <path>`. An inline snippet trips the rule
    on your own bash call, and `omp` does not resolve `local://`.
  - Registration: `omp ttsr list` shows `<name> [native]` with the planned
    condition and scope.
  - False positives:
    `omp ttsr scan -r rules/<file>.md <repo under ~/src> --verbose` → every hit
    is a real violation.

## Agents

- File `agents/<name>.md`; `name` is the file stem, kebab-case. `name` and
  `description` are required; a file missing either is skipped with a warning.
  Key order: `name`, `description`, `model`, `thinking-level`, `blocking`,
  `read-summarize`, `tools`, `spawns`, `output`.
- `model`: a quoted role alias from `config.yml` `modelRoles` (`"@judge"`,
  `"@smol"`), never a model id.
- `tools`: only what the prompt uses; agents that judge or report get no `edit`
  or `write`.
- `output`: a JSON schema with `additionalProperties: false` and complete
  `required` lists at every level.
- Body: `# <Title>`, then `## Inputs`, numbered step sections, `## Report`.
- Names match exactly and first wins, so a file here replaces the bundled agent
  of the same name. Never run `omp agents unpack` into this dir: the copies
  would shadow the bundled agents and freeze them against updates.
- `extensions/quality-gate.ts` owns gate and review cycles; the gate runs in
  `extensions/lib/gate-runner.ts`, with review agents `entropy-review` and
  `code-review`. Gate outcomes are `pass|findings|blocked|skipped`; reviewer
  statuses and `review_verdict` data remain coupled to the extension. Review
  scope (`extensions/lib/review-scope.ts`), report validation
  (`extensions/lib/review-report.ts`), and static evidence for `entropy-review`
  (`extensions/lib/static-evidence.ts` with language profiles
  `extensions/lib/python-evidence.ts`: `uvx ty server` references and incoming
  calls, `uvx ruff` C901 McCabe scores; `extensions/lib/typescript-evidence.ts`:
  `tsc --lsp --stdio` references and incoming calls, Biome cognitive-complexity
  scores) are deterministic; the agents judge them. The
  `/hybrid-review [diff|repo]` command (registered in `quality-gate.ts`, default
  `diff`) runs only the review step, without the gate or an approved plan:
  `diff` scopes unstaged and untracked changes, `repo` every reviewable file
  whole; it collects `review_verdict` decisions, never implements findings, and
  while it is unfinished, session stops serve it before any approved-plan cycle.
  Change a review agent's `## Report` field rules together with
  `review-report.ts`, which enforces them.
  - `session_stop` reserves the sole in-memory run before fingerprint
    preparation, persists a `quality-gate.start` entry before launching the gate
    asynchronously, and returns `{ decision: "block" }`. Each stop polls
    in-flight preparation, gate, or review-scope work for at most
    `STOP_WAIT_MS` (15 s) in total, then returns block, staying under the
    host's 30 s handler deadline. Review scopes run in managed timers, are
    reused while the working-tree fingerprint is unchanged, and a scope that
    still fails after two retries closes the cycle with a BLOCKED report.
    Persist the report (`quality-gate.gate-run`) before proceeding, turn errors
    into findings, and consume the run only after its post-run fingerprint
    matches. Use a managed timer and gate-owned `AbortController`;
    `session_shutdown` aborts the gate, drops its job, and makes stale
    callbacks inert.
  - No other handler waits on unbounded work: `tool_result` checks review
    reports within `HANDLER_BUDGET_MS` (25 s) and records a failed check as an
    `error` run; `before_agent_start` builds the review briefing within the
    same budget, with static evidence cut off at `BRIEFING_BUDGET_MS` (20 s).
    Git failures while computing a review scope are errors, never an empty
    scope.
  - Gate steps carry `durationMs`. `unavailable` steps (tool missing, Terraform
    provider unavailable for the CLI's platform, registry unreachable) form the
    report's `environment` list, never findings or blockers, and
    `terraform validate` is skipped after a failed `init` in the same
    directory.
  - User-facing output: every findings or blocked gate report and every
    recorded review run is shown as a `quality-gate.card` custom message
    (`deliverAs: "aside"`; its content is a one-line note for the model, and
    the registered renderer draws `details`). The status line shows live gate
    progress, a toast reports each run's outcome, `pi.logger.debug` writes
    `quality-gate.*` lines to the OMP log, and a warning names any extension
    file modified after the process loaded it.
  - Suppressions: `<repo_root>/.omp/quality-suppressions.yaml` is user-owned and
    gitignored; `ensureGitignored` (`extensions/lib/project-index.ts`) appends
    `/.omp/` to a repo's `.gitignore` at main-session start unless a
    `.gitignore` already decides both `.omp/project-index.yaml` and that file.
    It holds exactly one key, `suppressions`: a list of entries with exactly
    `agent` (`entropy-review` or `code-review`), `file` (repo-relative, `/`
    separators), `rule` (KB rule text), and `reason`, each non-blank; JSON
    syntax parses too. `extensions/lib/review-suppressions.ts` parses it;
    `review-report.ts` drops an agent's findings whose `file` equals an entry's
    and whose rule text contains, or is contained in, the entry's `rule`, at any
    line; `quality-gate.ts` lists each agent's entries in its review-scope
    briefing and appends the dropped findings, or the invalid-file problem (then
    nothing is suppressed), to the review `task` result. policy-guard confirms
    every agent `edit`, `write`, or `ast_edit` of the file; headless sessions
    block it.
- Verify: `omp -p --no-session --tools task "<prompt>"` with `<prompt>` set to
  these spans joined by one space:
  `Without calling any tool, list the agent names your task tool offers,`
  `one per line.`; its output includes `<name>`; one task on a disposable
  fixture returns output that fits the schema.

## Extensions

- File `extensions/<name>.ts`:
  `export default function <camelName>(pi: ExtensionAPI)`, returning `void` or a
  promise. Imports: `node:*` builtins and
  `import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent"`; schemas via
  `pi.arktype`. No other packages (`AGENTS.md` dependency rule).
- Helpers go in a subdir without `index.ts` (e.g., `extensions/lib/`), imported
  as `./lib/<file>.ts`. A top-level helper is loaded as an extension and fails
  (omp://extension-loading.md).
- Persisted entry and message types: `<extension>.<entry>` (portable; never
  include a username). Registered tools: snake_case and unique in the tool list.
- `extensions/policy-guard.ts` checks bash commands, dependency manifests,
  `.omp/quality-suppressions.yaml` edits, and MCP tools; it does not classify
  `eval` calls. Eval approval follows OMP's built-in policy
  (`omp://approval-mode.md`).
- `mcp-catalog.json` (logic in `extensions/lib/mcp-catalog.ts`) maps each
  `mcp__` tool to `read`, `write`, or `unknown`; a tool whose input schema has
  exactly one required string-enum property is keyed per value as
  `{ "selector": "<property>", "values": { "<value>": "<effect>" } }`. `read`
  runs without a prompt, `write` confirms every call, and `unknown` asks once
  with a select whose answer is written back; headless sessions block `write`
  and `unknown`. Interactive session start adds newly registered tools and enum
  values as `unknown` and resets an entry whose shape no longer matches its
  tool's schema. The file is validated on every MCP call; while it is invalid,
  every MCP call confirms and the file is never rewritten. Writes are sorted and
  go through `mcp-catalog.json.tmp` plus a rename.
- `cli-catalog.json` (logic in `extensions/lib/cli-catalog.ts`; both catalogues
  load, validate, and write through `extensions/lib/catalog-file.ts`) holds one
  entry per subcommand CLI (`az`, `databricks`, `astro`): `resolver`,
  `globalFlags` (`value` or `boolean`), `subtrees`, `commands`, `readVerbs`, and
  `readVerbPrefixes`. Bash segments meet the code rules in
  `extensions/lib/policy.ts` first (python, dependency adds, git, terraform, the
  `az rest` method check, curl, wget, PowerShell web, SQL tools); a program with
  no entry is not checked further. Command words are the tokens after the
  program, skipping known global flags, up to the first other flag; a flag
  before any word confirms. The longest word prefix in `subtrees` decides first,
  then `commands`: matched by word prefix for the `help` resolver, whose keys
  are leaf paths, and exactly for `leading-words`. Otherwise `help` (cobra CLIs)
  reads the path from the `Usage:` line of `<program> help <words>` and confirms
  a group, an unknown command, or a failed lookup; `leading-words` (az) takes
  the words as the path. A path whose last word is in `readVerbs` or starts with
  a `readVerbPrefixes` entry is recorded as `read`; any other path asks once
  with a select whose answer is written back, and headless sessions block it.
  `read` runs without a prompt and `write` confirms every call. While the file
  is missing or invalid, every bash segment that no code rule decides confirms
  and the file is never rewritten. Writes are sorted and go through
  `cli-catalog.json.tmp` plus a rename.
- `extensions/jira-plan-decisions.ts` stages each approved plan's decisions
  (`ask` answers plus the plan's Context and Assumptions sections) as a Jira
  comment, has the model post it through
  `mcp__atlassian_addoreditjiraissuecomment`, and substitutes the staged body in
  `tool_call`; policy-guard's confirm is the per-post consent, so that tool
  stays `write` in `mcp-catalog.json`. Approval detection (`findPlanMarker`)
  lives in `extensions/lib/session.ts`, shared with `quality-gate.ts`. Its event
  handlers never open or await a dialog (the host abandons a handler after 30
  s): one issue key in a plan-mode prompt sets the story, otherwise a warning
  toast points to `/jira-story <KEY>`; a plan approved without a story is staged
  unposted, and `/jira-story <KEY>` posts it.
- Extensions load once at OMP startup, so edits apply after a restart. Load
  errors go to `~/.omp/logs/omp.<date>.<pid>.log`.
- This dir has no `tsconfig.json` or lint config. The quality gate's `typescript`
  group runs `biome lint` on changed `.ts`, `.tsx`, `.mts`, and `.cts` files and
  `tsc --noEmit --pretty false` in each nearest `tsconfig.json` directory, so
  extensions are linted but never type-checked; the builtin `ts-*` and the
  `tsk-*` TTSR rules fire on `.ts` edits.
- Verify: run `omp -p --no-session --no-tools "Reply OK."`; the newest
  `~/.omp/logs/omp.*.log` shows no load error naming `<name>.ts`; exercise each
  event path on a disposable fixture.
