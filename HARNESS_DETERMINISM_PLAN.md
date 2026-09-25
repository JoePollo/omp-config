# Harness determinism rework

## Checkpoint (2026-09-25)
- Status: the plan is complete through the skill-driven, generated project-index design. It is not yet approved, nothing has been implemented, and the working tree is unchanged.
- Resume: in a plan-mode session in `~/.omp/agent`, review this file, then approve it. The originating session also resumes with `omp --resume 01a0da45`; its copy of this plan is `sessions/-.omp-agent/2026-09-25T20-32-37-673Z_01a0da45-1d29-7774-81a0-6b3a1f91505e/local/harness-determinism-plan.md`.
- Check first when implementing, since these runtime facts are unverified (see Contingencies):
  - `Bun.YAML` exists in omp's embedded runtime.
  - The `before_agent_start` `message` key works.
  - The `session_init` child test is correct.
  - `tool_call` interception covers `xd://mcp__*` writes.

## Context
Ask: review omp harness guidance against the config in `~/.omp/agent`, then move model-interpreted plaintext workflow steps into deterministic harness mechanisms. The user's example was turning the JIT domain router into a TypeScript extension.

Decisions taken:
1. Guarded operations get a confirm dialog in the main session and are blocked in subagents.
2. The quality gate runs its checks itself, and the smol gate agent is deleted.
3. Edit/write-scoped TTSR rules switch to `interruptMode: tool-only`.
4. KB routing becomes a generated **project index**:
   - An extension prehooks every session started in a git repo. Before any prompt or tool call, it programmatically writes `<repo>/.omp/project-index.yaml` (synopsis, detected domains, area map) and adds the file to the repo's `.gitignore` if it is not already listed there.
   - Domains are never hardcoded: they are walked at runtime from each skill's `kb` frontmatter rules. Adding a KB means adding a skill folder, with no tooling change.
5. coding-entropy keeps its git-working-tree gate. It is declared as `kb.gate: commit-bound`.
6. `eval` is blocked while plan mode is active.

End state: KB delivery, AGENTS.md strict-rule enforcement, gate execution, and index generation all run as code. Review verdicts stay model judgment.

### Review summary (grounds every step)
- Harness guidance already followed: extensions are the current surface (hooks are legacy). `quality-gate.ts` already persists state with `pi.appendEntry`, rebuilds it from `ctx.sessionManager.getBranch()`, and holds completion with `session_stop` `{ decision: "block" }`.
- Mechanism facts used below (omp://extensions.md, omp://hooks.md, omp://session.md, omp://compaction.md, omp://approval-mode.md, omp://skills.md):
  - `tool_call` returns `{ block?, reason?, input?, additionalContext? }`; a handler throw blocks the call (fail-closed).
  - `tool_result` returns `{ content?, details?, isError? }`.
  - `before_agent_start` returns `{ message? }`, appended after the user prompt. This is the HookAPI contract; the extension key is unverified until Verification 6 (see Contingencies).
  - `pi.sendMessage(msg, { deliverAs: "aside" })` persists a `custom_message` (`customType`, `content`, `display`, `details`, `attribution`) in LLM context.
  - Tool-output pruning can blank old tool results, so KB text never travels in ordinary tool results.
  - `ctx.hasUI` is false in subagents and print mode. `ctx.ui.confirm(title, message)` returns a boolean.
  - Task children rebind the parent's extension factories. Their branch holds a `session_init` entry with a `task` field (session.md example; checked by Verification 2).
  - Skill frontmatter keeps unknown keys as metadata, so a `kb` key is inert to the harness.
  - `compaction` entries carry `firstKeptEntryId`; `/clear` writes `reset_boundary`; `mode_change.mode === "plan"` marks plan mode.
  - `tools.approval` and `bash.patterns` key on tool name, but MCP tools here arrive as `write` to `xd://mcp__*`, and approval coverage of that dispatch is unverified. `eval` bypasses `bash.patterns`. A `tool_call` handler sees every one of these paths.
- Probabilistic points being removed:
  - KB loading depends on the model obeying `rules/domain-router.md`.
  - AGENTS.md STRICT RULES are unenforced: `config.yml` has no approval policy, and the default mode is `yolo`.
  - `agents/quality-gate.md` is an LLM that runs a command table and self-reports.
  - Reviewers load KBs only by instruction.
  - With TTSR `never`, a violating edit lands before its rule arrives.

## Approach
Every path is relative to `~/.omp/agent`. There is no build step: extensions load from source (Bun).
- Allowed imports: node builtins, Bun APIs (`Bun.Glob`, `Bun.YAML`), and type-only `@oh-my-pi/pi-coding-agent`.
- No new dependencies.
- No inline comments (AGENTS.md).
- No KB or domain name appears in extension code.

### 1. Shared library `extensions/lib/` (prerequisite for steps 2–4)
Extension entries stay at the top level (`extensions/<name>.ts`). Helpers live in `extensions/lib/`, which has no `index.ts`, so discovery skips it (omp://extension-loading.md scans one level: direct `*.ts` and subdir `index.ts`). Import them as `./lib/<file>.ts`.

`lib/session.ts`:
- Move `BranchEntry` (quality-gate.ts:18-30) and `textOf` (:113-125) here verbatim and export both. Add optional `details?: Record<string, unknown>`, `firstKeptEntryId?: string`, and `task?: unknown`.
- `export type Exec = (command: string, args: string[], options: { cwd: string; timeout?: number; signal?: AbortSignal }) => Promise<{ stdout: string; stderr: string; code: number; killed?: boolean }>`. Callers pass `(c, a, o) => pi.exec(c, a, o)`.
- `export function latestMode(entries: readonly BranchEntry[]): string`: the `mode` of the latest `mode_change`, else `"none"`.
- `export function isTaskSession(branch: readonly BranchEntry[]): boolean`: some entry has `type === "session_init"` and a string `task`.
- Delete `planModeActive` (quality-gate.ts:189-195). Its call at :440 becomes `if (latestMode(after) === "plan") return;`. quality-gate.ts imports `BranchEntry`, `textOf`, and `latestMode` from `./lib/session.ts`.

`lib/shell.ts`:
- `export function programName(token: string): string`: the basename after the last `/` or `\`, lowercased, with a trailing `.exe`, `.cmd`, `.bat`, or `.ps1` removed.
- `export function commandSegments(command: string): string[][]` returns one argv per segment:
  - Split on `/&&|\|\||[;|&\n`()]|\$\(/`, ignoring quotes (conservative).
  - Tokenize each segment with `/"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g`, taking the first defined group.
  - Drop leading `NAME=value` tokens (`/^[A-Za-z_][A-Za-z0-9_]*=/`).
  - Drop leading wrappers: `sudo`, `env` (plus its `-*` flags), `command`, `time`, `nohup`, `exec`, `call`.
  - Set `argv[0] = programName(argv[0])`. Skip empty segments.
  - Recurse into the next token and append its segments when:
    - the program is `bash`, `sh`, `zsh`, or `dash`, and a token matches `/^-[a-z]*c[a-z]*$/`;
    - the program is `pwsh` or `powershell`, and a token lowercases to `-c` or `-command`;
    - the program is `cmd`, and a token lowercases to `/c` or `/k`.

`lib/tool-args.ts`:
- `export type Target = { path: string; content: string }`.
- `export function isInternalUrl(path: string): boolean`: `/^[a-z][a-z0-9+.-]*:\/\//i`. It never matches `C:/`.
- `export function stripReadSelector(path: string): string`: removes a trailing `(?::(?:raw|img|conflicts|-?\d+(?:[-+]\d*)?(?:,\d+(?:[-+]\d*)?)*))+$`.
- `export function mutationTargets(toolName: string, input: Record<string, unknown>): Target[]`:
  - `edit`, when `input.input` is a hashline string:
    - each section header `/^\[(.+?)#[0-9A-Fa-f]{4}\]\s*$/m` is a target whose content runs to the next header;
    - each `MV` line `/^MV\s+"?(.+?)"?\s*$/m` adds a destination with empty content.
    - Otherwise use `input.path`.
  - `write`:
    - a plain path gives `{ path, content }`;
    - `xd://ast_edit` means `JSON.parse(input.content)`: one target per string in `.paths`, with content = `.ops[].out` joined by `\n`. A JSON error gives `[]`;
    - any other `xd://` path gives `[]`.
  - `ast_edit`: one target per string in `input.paths`.
  - Anything else gives `[]`. Non-string fields are ignored, never thrown on.
- `export function mcpToolName(toolName: string, input: Record<string, unknown>): string | null`: `toolName` when it starts with `mcp__`; `input.path.slice(5)` for a `write` whose path starts with `xd://mcp__`; otherwise `null`.

### 2. Project index and domain router
#### 2a. KB rules live in skill frontmatter and are walked at runtime
A skill is a KB only when its `SKILL.md` frontmatter has a `kb` key. Every other skill is ignored. The `kb` contract:
```yaml
kb:
  gate: files                     # "files" (default) or "commit-bound"; commit-bound permits no other kb key
  files: ['<glob>', …]            # lowercase globs over repo-relative paths; any matching file makes the KB present
  exclude: ['<glob>', …]          # paths never counted for this KB or its topics
  content:                        # probes: a file matching `files` whose first 262,144 bytes match `pattern` makes the KB present
    - { files: '<glob>', pattern: '<JS regex source>', flags: '<subset of "isu">' }   # "m" is always added
  commands: ['<JS regex source>', …]   # tested against each bash segment line (argv joined by spaces)
  mcp: ['mcp__<prefix>', …]            # MCP tool-name prefixes
  topics:                              # each: file exists beside SKILL.md, is *.md, is not SKILL.md; has ≥1 of files/content/commands
    - { file: '<topic>.md', files: […], content: […], commands: […] }
```

`lib/skills.ts`:
- Exports:
  - `export type Probe = { files: string; pattern: RegExp }`
  - `export type TopicRule = { file: string; files: string[]; content: Probe[]; commands: RegExp[] }`
  - `export type KbSkill = { name: string; dir: string; description: string; gate: "files" | "commit-bound"; files: string[]; exclude: string[]; content: Probe[]; commands: RegExp[]; mcp: string[]; topics: TopicRule[]; raw: unknown }`
  - `export function loadKbSkills(skillsDir: string): { skills: KbSkill[]; errors: string[] }`
- `loadKbSkills` behavior:
  - Reads `<skillsDir>/*/SKILL.md`, one level deep.
  - Extracts frontmatter with `/^---\r?\n([\s\S]*?)\r?\n---\r?\n/` and parses it with `Bun.YAML.parse`.
  - Names come from frontmatter `name`, else the directory name.
  - Validates `kb` against the contract, rejecting unknown keys and bad types, then compiles regexes with `new RegExp(source, flags + "m")`.
  - A skill that fails validation is left out, with one error string `<name>: <problem>`. Output is sorted by name.
  - Results are cached per set of `SKILL.md` mtimes.
- Globs match lowercased repo-relative paths through cached `new Bun.Glob(pattern).match(path)`.

Add a `kb` block, after `hide: true` and before the closing `---`, to each existing KB skill. These are data only; later KBs follow the same contract with no code change.
- `skills/python/SKILL.md`:
```yaml
kb:
  files: ['**/*.py', '**/*.pyi', '**/*.ipynb', '**/pyproject.toml', '**/uv.lock', '**/requirements*.txt', '**/setup.py', '**/setup.cfg', '**/.python-version']
  topics:
    - file: typing.md
      files: ['**/*.pyi', '**/py.typed']
      content: [{ files: '**/*.py', pattern: '^\s*from\s+typing(?:_extensions)?\s+import\s[^\n]*\b(?:Protocol|TypedDict|TypeVar|ParamSpec|overload|Generic)\b' }]
    - file: pydantic.md
      content: [{ files: '**/*.py', pattern: '^\s*(?:from|import)\s+pydantic(?:_settings)?\b' }]
    - file: packaging.md
      files: ['**/pyproject.toml', '**/uv.lock', '**/requirements*.txt', '**/.python-version']
    - file: testing.md
      files: ['**/test_*.py', '**/*_test.py', '**/conftest.py', '**/tests/**/*.py']
    - file: concurrency.md
      content: [{ files: '**/*.py', pattern: '^\s*(?:import|from)\s+(?:asyncio|threading|multiprocessing|concurrent\.futures)\b|^\s*async\s+def\b' }]
    - file: security.md
      content: [{ files: '**/*.py', pattern: '^\s*(?:import|from)\s+(?:subprocess|requests|httpx|urllib|pickle|yaml|tarfile|zipfile|xml|tempfile|sqlalchemy|pyodbc|pymssql|psycopg)\b' }]
```
- `skills/airflow/SKILL.md`:
```yaml
kb:
  files: ['**/.astro/config.yaml', '**/airflow_settings.yaml', '**/.airflowignore']
  content:
    - { files: '**/*.py', pattern: '^\s*(?:from|import)\s+airflow\b' }
    - { files: '**/dockerfile', pattern: 'astro-runtime|astrocrpublic\.azurecr\.io/runtime' }
  commands: ['^(?:astro|airflow)\b']
  mcp: ['mcp__airflow_']
  topics:
    - file: authoring.md
      content: [{ files: '**/*.py', pattern: '^\s*from\s+airflow\.sdk\s+import\b|@dag\b|\bDAG\s*\(' }]
    - file: parsing.md
      files: ['**/.airflowignore']
      content: [{ files: '**/*.py', pattern: '@dag\b|\bDAG\s*\(' }]
    - file: tasks.md
      content: [{ files: '**/*.py', pattern: '@task\b|\bXCom\b|Sensor\b|\bdeferrable\s*=' }]
    - file: astro-project.md
      files: ['**/.astro/config.yaml', '**/airflow_settings.yaml', '**/packages.txt']
      content: [{ files: '**/dockerfile', pattern: 'astro-runtime|astrocrpublic\.azurecr\.io/runtime' }]
      commands: ['^astro\s+dev\b']
    - file: astro-deploy.md
      commands: ['^astro\s+(?:deploy|deployment)\b']
    - file: testing.md
      content: [{ files: '**/tests/**/*.py', pattern: '^\s*(?:from|import)\s+airflow\b|\bDagBag\b' }]
      commands: ['^astro\s+dev\s+(?:parse|pytest)\b', '^airflow\s+dags\s+test\b']
    - file: databricks.md
      content: [{ files: '**/*.py', pattern: '\bairflow\.providers\.databricks\b' }]
```
- `skills/databricks-platform/SKILL.md`:
```yaml
kb:
  files: ['**/databricks.yml', '**/databricks.yaml', '**/spark-pipeline.yml', '**/spark-pipeline.yaml']
  content:
    - { files: '**/*.{py,sql,scala}', pattern: '^(?:#|--|//) Databricks notebook source|\bpyspark\.pipelines\b|^\s*import\s+dlt\b|\bdbutils\.' }
    - { files: '**/*.ipynb', pattern: 'application/vnd\.databricks' }
    - { files: '**/*.sql', pattern: '\b(?:STREAMING\s+TABLE|MATERIALIZED\s+VIEW|AUTO\s+CDC|APPLY\s+CHANGES\s+INTO|CLUSTER\s+BY)\b', flags: i }
  commands: ['^databricks\b']
  mcp: ['mcp__databricks_sql_']
  topics:
    - file: data-platform-bundle.md
      files: ['**/data_platform/**']
    - file: lakeflow-connect.md
      content: [{ files: '**/*.{py,yml,yaml,json}', pattern: '\bcloudFiles\b|\bingestion_definition\b|\bgateway_definition\b' }]
    - file: pipelines.md
      files: ['**/databricks.yml', '**/databricks.yaml', '**/spark-pipeline.yml', '**/spark-pipeline.yaml']
      content: [{ files: '**/*.{py,sql}', pattern: '\bpyspark\.pipelines\b|^\s*import\s+dlt\b|STREAMING\s+TABLE|MATERIALIZED\s+VIEW|AUTO\s+CDC', flags: i }]
    - file: delta-tables.md
      content: [{ files: '**/*.{py,sql}', pattern: '\b(?:CLUSTER\s+BY|PARTITIONED\s+BY|ZORDER\s+BY|MERGE\s+INTO|DeltaTable)\b|^\s*(?:OPTIMIZE|VACUUM)\s' }]
    - file: unity-catalog.md
      content: [{ files: '**/*.{py,sql}', pattern: '\b(?:GRANT|REVOKE)\b[^;\n]*\bON\b|\bCREATE\s+(?:VOLUME|EXTERNAL\s+LOCATION)\b', flags: i }]
    - file: data-quality.md
      content: [{ files: '**/*.{py,sql}', pattern: '@(?:dp|dlt)\.expect|\bEXPECT\s*\(|\bCONSTRAINT\b[^\n]*\bEXPECT\b', flags: i }]
```
- `skills/databricks-silver-modeling/SKILL.md`:
```yaml
kb:
  files: ['**/data_platform/**/silver/**']
  exclude: ['**/*legacy*/**', '**/*legacy*']
  content:
    - { files: '**/*.{py,sql}', pattern: '\bdwh_(?:dev|tst|prd)\.silver\b', flags: i }
```
- `skills/terraform/SKILL.md`:
```yaml
kb:
  files: ['**/*.tf', '**/*.tfvars', '**/*.tftest.hcl', '**/*.tf.json', '**/.terraform.lock.hcl']
  content:
    - { files: '**/*.{yml,yaml}', pattern: '\bterraform\b', flags: i }
  commands: ['^terraform\b']
  topics:
    - file: language.md
      files: ['**/*.tf']
    - file: modules.md
      files: ['**/modules/**/*.tf', '**/.terraform.lock.hcl']
      content: [{ files: '**/*.tf', pattern: '^\s*module\s+"|\brequired_providers\b' }]
    - file: state.md
      content: [{ files: '**/*.tf', pattern: '^\s*(?:backend\s+"|moved\s*\{|import\s*\{|removed\s*\{)' }]
    - file: security.md
      content: [{ files: '**/*.{tf,tfvars}', pattern: '\bsensitive\s*=\s*true\b|\bephemeral\s+"|_wo\s*=' }]
    - file: pipelines.md
      content: [{ files: '**/*.{yml,yaml}', pattern: '\bterraform\b', flags: i }]
    - file: testing.md
      files: ['**/*.tftest.hcl']
      commands: ['^terraform\s+(?:-chdir=\S+\s+)?(?:test|validate)\b']
    - file: azure.md
      content: [{ files: '**/*.tf', pattern: '\b(?:azurerm|azuread|azapi)_[a-z0-9_]+\b' }]
    - file: databricks.md
      content: [{ files: '**/*.tf', pattern: '"databricks_[a-z0-9_]+"|databricks/databricks' }]
    - file: astro.md
      content: [{ files: '**/*.tf', pattern: '"astro_[a-z0-9_]+"|astronomer/astro' }]
```
- `skills/coding-entropy/SKILL.md`:
```yaml
kb:
  gate: commit-bound
```

#### 2b. Index contract and generator (`lib/project-index.ts`)
Contract of `<mainRoot>/.omp/project-index.yaml`. Every object rejects unknown keys.
```yaml
version: 1
generator:
  name: domain-router
  commit: <40-hex HEAD sha or "none">
  rules: <first 12 hex of sha256(JSON.stringify(KB skills sorted by name → [name, raw kb]))>
project:
  name: <basename of mainRoot>
  synopsis: <≤600 chars>
  synopsisSource: <"README.md" | "pyproject.toml" | "package.json" | "databricks.yml" | "generated">
domains:                        # "files"-gate KBs with ≥1 counted file, sorted by name
  - { name: <skill>, files: <count> }
map:                            # sorted by path; "./" is the repo root's own files
  - path: <"./" or "<dir>/">
    files: <count in subtree; root: direct files only>
    types: { <ext or "(none)">: <count> }   # top 5 by count desc, then key asc
    readme: <first paragraph of <dir>/README.md (case-insensitive), ≤200 chars, or null>
    domains: [<skill>, …]                   # KBs with ≥1 counted file in the area, sorted by name
    topics: ['<skill>/<file>', …]           # topics of those KBs with ≥1 matching file in the area; skill order, then declaration order
```

Exports:
- Constants: `INDEX_RELATIVE_PATH = ".omp/project-index.yaml"`, `GITIGNORE_LINE = "/.omp/project-index.yaml"`.
- Types: `RepoRef = { worktreeRoot; mainRoot; indexPath }`, `AreaEntry`, `ProjectIndex`.
- `resolveRepo(exec, dir): Promise<RepoRef | null>`:
  - Runs one `git rev-parse --path-format=absolute --show-toplevel --git-common-dir` (cwd `dir`, 15 s timeout). A nonzero exit gives `null`.
  - `mainRoot = basename(commonDir) === ".git" ? dirname(commonDir) : worktreeRoot`, so task worktrees share the main checkout's index.
  - `indexPath = join(mainRoot, INDEX_RELATIVE_PATH)`.
- `ensureGitignored(exec, repo): Promise<boolean>`:
  - Run `git check-ignore -v -- .omp/project-index.yaml` in `mainRoot`. If it exits 0 and the part of stdout before the tab matches `/\.gitignore:\d+:/`, the entry is already present: return `false`.
  - Otherwise append `GITIGNORE_LINE` to `<mainRoot>/.gitignore`, creating the file if needed. Add a separating newline when the file is non-empty and lacks a trailing one. Return `true`.
- `buildIndex(exec, repo, skills): Promise<ProjectIndex>`. Fully deterministic, with no timestamps:
  - Files: `git ls-files -z --cached --others --exclude-standard` in `mainRoot`, minus `INDEX_RELATIVE_PATH`. Paths are lowercased for matching and keep their original case for display.
  - Commit: `git rev-parse HEAD` in `mainRoot`, or `"none"` on a nonzero exit.
  - A file counts for a KB (gate `files`) when it matches no `exclude` glob and either matches a `files` glob or matches a probe's `files` glob and its content matches the probe `pattern`.
    - Content is the first 262,144 bytes, read as UTF-8 once per file and cached.
    - Each probe evaluates at most the first 5,000 matching paths in sorted order.
  - A topic file counts when it is not excluded and matches the topic's `files` or `content` rules.
  - Areas:
    - `./` covers direct root files.
    - Every depth-1 directory is an area.
    - Depth-2 and depth-3 directories are areas only when their `domains` or `topics` differ from their parent's.
    - Cap: 150 entries. Take depth-1 first, then depth-2 in path order, then depth-3 in path order.
  - `readme` / synopsis paragraph extraction:
    - Strip frontmatter. Split on blank lines.
    - Skip blocks that start with `#`, `![`, `[![`, `<`, `|`, `` ``` ``, or `---`.
    - Take the first remaining block. Replace `[text](url)` with `text` and collapse whitespace.
    - Truncate to the cap, ending with `…`.
  - Synopsis source order:
    1. root `README.md`;
    2. `pyproject.toml` `description` inside `[project]` (regex `^\s*description\s*=\s*"([^"]*)"` between `[project]` and the next `[` header);
    3. `package.json` `.description`;
    4. `databricks.yml` `bundle.name` (via `Bun.YAML.parse`);
    5. otherwise `"<name>: <N> files in <K> top-level areas (<depth-1 area paths joined ", ">)."` with source `generated`.
- `validateIndex(data: unknown): { index: ProjectIndex | null; errors: string[] }`: a structural check against the contract. Errors read `<json-path>: <problem>`.
- `serializeIndex(index): string`: builds keys in contract order and calls `Bun.YAML.stringify`, ending with a newline.
- `readIndexFile(repo): ProjectIndex | null`: returns `null` when the file is missing, fails `Bun.YAML.parse`, or fails `validateIndex`.
- `areaFor(index, relPath): AreaEntry | null`:
  - A path with no `/` maps to `./`.
  - Otherwise, the deepest directory entry whose path is a prefix of `relPath`.
  - No such entry gives `null`.

#### 2c. `extensions/domain-router.ts` (default export `domainRouter(pi: ExtensionAPI)`)
Constants:
- `KB_MESSAGE = "jpollock.domain-router.kb"`
- `AGENT_DIR = join(import.meta.dir, "..")`, `SKILLS_DIR = join(AGENT_DIR, "skills")`
- `CODE_EXTENSIONS` = `.py .pyi .ipynb .ts .tsx .js .jsx .mjs .cjs .sql .tf .tfvars .hcl .ps1 .psm1 .sh .bash .cs .go .rs .java .kt .scala .yml .yaml .json .toml`

State: `ready: Promise<void>`, `skills: KbSkill[]`, and `cwdRepo: RepoRef | null`. Caches: `indexes: Map<mainRoot, ProjectIndex>`, `resolved: Map<dir, RepoRef | null>`, `bound: Map<abs, boolean>`, `refreshedThisTurn: Set<mainRoot>`, and `queued: Set<string>`.

**Prehook (startup).** `prepare(ctx)` runs on `session_start` and `session_switch`; `ready` holds its promise.
1. `skills = loadKbSkills(SKILLS_DIR)`. Each error notifies `domain-router: <error>` (error level).
2. `cwdRepo = await resolveRepo(exec, ctx.cwd)`. If `null`, stop here.
3. Main session (`!isTaskSession(branch)`):
   1. If `ensureGitignored` returns true, notify `project-index: added /.omp/project-index.yaml to <mainRoot>/.gitignore`.
   2. `index = await buildIndex(...)`.
   3. When `serializeIndex(index)` differs from the file's current text, `mkdirSync(dirname(indexPath), { recursive: true })` and `writeFileSync`.
   4. Notify `project-index: <written|unchanged> <indexPath> (<n> areas; domains: <names or none>)`.
4. Task session: `index = readIndexFile(cwdRepo) ?? await buildIndex(...)`. No files are written.
5. `indexes.set(mainRoot, index)`.

`before_agent_start`, `tool_call`, and `tool_result` each begin with `await (ready ??= prepare(ctx))`, so nothing runs before the index exists. In plan mode, this means the index precedes the planner. A `prepare` failure is caught: it notifies `domain-router: <message>` (error), and routing continues with no index.

Delivered keys and context:
- Delivered keys are the union of three sources:
  1. `details.keys` of `custom_message` entries with `customType === KB_MESSAGE` at or after `contextStart(branch)`;
  2. `read` toolCall blocks with `skill://` paths after `contextStart`: `skill://<s>` and `skill://<s>/SKILL.md` give `<s>`; `skill://<s>/<t>` gives `<s>/<t>`;
  3. `queued`.
- `queued.clear()` and `refreshedThisTurn.clear()` run on `turn_start`, `session_start`, `session_switch`, `session_branch`, `session_tree`, and `session_compact`.
- `contextStart(branch)`: start at the index after the latest `reset_boundary`. If a later `compaction` exists, use the index of the entry whose id equals its `firstKeptEntryId`, or the index after the compaction when that id is missing.

Keys, bodies, and messages:
- `project:<mainRoot>`: the orientation. `mainRoot` is normalized with `/` separators and lowercased.
- `<skill>`: its `SKILL.md` body.
- `<skill>/<topic>`: the topic body.
- Bodies are read with `readFileSync`, and frontmatter is stripped with `/^---\r?\n[\s\S]*?\r?\n---\r?\n/`. A missing file drops its key and notifies once per process.
- `send(keys, trigger, ctx)`:
  - Each key contributes a header plus its body. The skill header is `[domain-router] skill://<s> (trigger: <t>). Apply it; also read any other topic file it selects.` The topic header is `[domain-router] skill://<s>/<file> (trigger: <t>).`
  - The whole batch goes out as `pi.sendMessage({ customType: KB_MESSAGE, content, display: false, details: { keys }, attribution: "agent" }, { deliverAs: "aside" })`.
  - Then add the keys to `queued` and notify `domain-router: <urls>` (info).
- `ORIENTATION(index, repo)`:
  - Header: `[project-index] <name> — <indexPath> (generated from skill kb rules, commit <commit first 8>)`.
  - The synopsis.
  - `Domains: <name (files), … or none>`.
  - `Areas:`, one line per area of depth ≤ 2, at most 60: `- <path> — <files> files (<types>)`, plus `[<domains>; topics: <topics>]` when non-empty, plus ` — <readme>` when set. A trailing `(<n> more in <indexPath>)` line appears when areas were cut.
  - `KB catalog:` with one `- skill://<name> — <description>` line per KB skill, followed by `Read a catalog KB yourself when work it covers starts before any call touches its files.`
  - Outside a git repo, the orientation is only the KB catalog, under key `catalog`.

`active` means `pi.getActiveTools()` includes `edit` or `write`. Read-only children such as scouts and reviewers get KB text only through an explicit `kb:` request.

JIT key sources for a path (resolved against `ctx.cwd`, internal URLs skipped):
- `repo = resolveRepo(dirname of the nearest existing ancestor)`.
- The index comes from `indexes.get(repo.mainRoot)`. If absent, build it in memory without writing, then cache it.
- `area = areaFor(index, relative(worktreeRoot, abs) with "/")`:
  - If `area` is `null` and `refreshedThisTurn` lacks the repo, rebuild the index (writing it only when `repo.mainRoot === cwdRepo.mainRoot` in a main session), add the repo to the set, and look up again.
  - Keys are `area.domains` plus `<skill>/<topic>` for each `area.topics` entry.
- Commit-bound skills (`gate: "commit-bound"`) are added when `boundForCommit(abs)` holds and the call is a mutation, or when the call is a read in plan mode.
- `boundForCommit(abs)`, cached, is true only when all of these hold:
  - the path is not under `os.tmpdir()`;
  - its extension is in `CODE_EXTENSIONS`;
  - `git rev-parse --show-toplevel` exits 0 from the nearest existing ancestor;
  - `git check-ignore -q -- <abs>` does not exit 0.

Handlers (a non-string input is skipped, never thrown on):
- `before_agent_start`:
  - `kb:` request: when `event.prompt` matches `/\bkb: ([a-z0-9-]+(?:, ?[a-z0-9-]+)*)\./`, take each named KB skill (unknown names notify `domain-router: unknown kb <name>`). Its key is undelivered-checked regardless of `active`.
  - Orientation: when `active` and `project:<root>` (or `catalog` outside a repo) is undelivered, add it.
  - Anything collected goes into one `{ message: { customType: KB_MESSAGE, content, display: false, details: { keys } } }` return.
- `tool_call`:
  1. Generated file: if any `mutationTargets` target resolves (case-insensitively) to a repo's `indexPath`, return `{ block: true, reason: "[domain-router] <indexPath> is generated at startup from skill kb rules; change the rules in skills/<name>/SKILL.md instead." }`.
  2. JIT (only when `active`): gather keys from every target path, including commit-bound skills. If any key is undelivered, call `send`, then return `{ block: true, reason: "[domain-router] Blocked once: <urls> were just added to context. Apply them, then re-issue this call." }`.
- `tool_result` (only when `active` and `!event.isError`):
  - `read`: keys for the selector-stripped path.
  - `bash`: for each `commandSegments(input.command)` line, each KB whose `commands` match adds `<skill>`, and each topic whose `commands` match adds `<skill>/<topic>`.
  - `mcpToolName(...) !== null`: each KB with an `mcp` prefix that the name starts with adds `<skill>`.
  - Undelivered keys call `send`. Return `undefined`.

`rules/domain-router.md`: keep `alwaysApply: true` and replace the body with:
```
Domain KBs load deterministically. At startup in a git repo the domain-router extension generates `<repo>/.omp/project-index.yaml` (listed in the repo's .gitignore) from every KB skill's `kb` frontmatter rules: synopsis, detected domains, and an area map. The first prompt receives the index summary and the KB catalog; each area's KB indexes and topic files load when a call first touches that area; matching commands and MCP tools load their KBs; code edits in a git working tree load the commit-bound KBs. An edit or write that would land before its KBs is blocked once, then re-issued. Delivery resets after compaction. The index file is generated: change KB routing in the skills' `kb` rules, never in the index. Read any other topic file an index selects yourself, and read a catalog KB yourself when work it covers starts before any call touches its files. Precedence: repo config > AGENTS.md > KB.
```

### 3. Policy guard extension (enforces AGENTS.md STRICT RULES)
`lib/policy.ts` exports:
- `type Category = "git-mutation" | "dependency-add" | "external-write" | "python-without-uv" | "planner-eval"`
- `type Verdict = { action: "confirm" | "block"; category: Category; detail: string }`
- `classifyCommand(command: string)`: the first non-null result over `commandSegments`; `line` is the segment joined by spaces.
- `classifyMcpTool(name)`, `classifyManifest(path)`, `classifyEval(code, mode)`.

Rules (`a[i]` = argv[i] of one segment):
- **python-without-uv** (block): `a[0]` matches `/^(?:python(?:\d+(?:\.\d+)?)?|py|pip\d*(?:\.\d+)?|pipx)$/`. Detail: ``Python runs only through uv (AGENTS.md): use `uv run python …`, `uv run <tool>`, or `uvx <tool>`; add dependencies with `uv add` (needs explicit permission). Blocked: <line>``.
- **dependency-add** (confirm). Detail: `New dependency (AGENTS.md: needs your explicit permission): <line>`. Matches:
  - `uv add`, `uv pip install`, `uv tool install`;
  - `npm`/`pnpm`/`bun` with `a[1]` ∈ {install, i, add}, and `yarn add`, when a later token does not start with `-`;
  - `winget install`, `choco install`, `scoop install`, `az extension add`;
  - `a[0]` ∈ {install-module, install-package, install-psresource}.
- **git-mutation** (confirm). Detail: `Git mutation (AGENTS.md: all git operations except pull and merge-conflict resolution need your approval): <line>`.
  - After `git`, skip global options: `-C`, `-c`, `--git-dir`, `--work-tree`, and `--namespace` consume the next token; other `--*`, `-P`, and `-p` are single tokens. The next token is `sub`, and the rest are `args`. No `sub` gives null.
  - Read subcommands (null): `status diff log show blame annotate grep ls-files ls-tree ls-remote rev-parse rev-list describe shortlog cat-file for-each-ref name-rev merge-base check-ignore check-attr show-ref show-branch var version help fetch pull diff-tree diff-index diff-files range-diff whatchanged count-objects fsck cherry difftool mergetool archive`.
  - Conditional reads (null only when the condition holds):
    - `reflog`: `args[0]` ∉ {expire, delete, drop}.
    - `branch`: no flag from {-d -D --delete -m -M --move -c -C --copy -f --force -u --set-upstream-to --unset-upstream --edit-description -t --track --no-track} (compared before `=`), and either every arg starts with `-` or args include `--list`, `-l`, or `--show-current`.
    - `tag`: no flag from {-d --delete -a --annotate -s --sign -u --local-user -f --force -m --message -F --file}, and either every arg starts with `-` or args include `-l` or `--list`.
    - `remote`: args empty or `args[0]` ∈ {-v, --verbose, show, get-url}.
    - `stash`: `args[0]` ∈ {list, show}.
    - `config`: `args[0]` ∈ {get, list}, or args include one of `--get --get-all --get-regexp --get-urlmatch --list -l`.
    - `worktree`: `args[0] === "list"`.
    - `submodule`: args empty or `args[0]` ∈ {status, summary}.
    - `notes`: args empty or `args[0]` ∈ {list, show}.
    - `checkout`: args include `--ours` or `--theirs`.
    - `lfs`: `args[0]` ∈ {ls-files, status, env, version}.
  - Every other subcommand is a mutation.
- **external-write** (confirm). Detail: `External-service write or live-state access (AGENTS.md: external services are read-only unless you explicitly permit): <line>`.
  - `READ_VERBS` = `show list get query exists check download wait tail browse version logs ls cat export describe status summary validate me`, plus any token starting with `list-`, `show-`, or `get-`.
  - `terraform`: skip `-chdir=*`, `-help`, `-version`, `-v`. Mutation when any of these holds:
    - `sub` ∈ {apply destroy import plan refresh query taint untaint force-unlock output show console state};
    - `sub` is `workspace` and the next token ∈ {new delete select list};
    - `sub` is `init` and args lack `-backend=false`.
  - `az`: `path` is the tokens after `az` up to the first `-*` token. Allowed when any of these holds; everything else is a mutation:
    - `path` is empty, or `path[0]` ∈ {login logout version help find config};
    - `path[0]` is `account` and `path[1]` ∈ {show list set get-access-token list-locations clear};
    - `path[0]` is `extension` and `path[1]` ∈ {list show list-available};
    - `path[0]` is `rest` and the method is get or head. The method is the value after `--method`/`-m`; it defaults to `get`, or to `post` when `--body`/`-b` is present;
    - otherwise, the last `path` token is a read verb.
  - `databricks`: `path` is built the same way. Allowed when any of these holds; everything else is a mutation:
    - `path[0]` ∈ {auth configure version help completion};
    - `path[0]` is `bundle` and `path[1]` ∈ {validate summary generate init schema open};
    - `path[0]` is `api` and `path[1]` ∈ {get head};
    - otherwise, the last `path` token is a read verb.
  - `astro`: allowed when `a[1]` ∈ {dev run version login logout context completion help config}, when `a[1]` is `deployment` with `a[2]` ∈ {list inspect logs}, or when `a[1]` ∈ {workspace organization} with `a[2]` ∈ {list switch}. Everything else is a mutation.
  - `curl`: mutation when the `-X`/`--request`/`--request=`/`-X<V>` value is not GET or HEAD, or when any of `-d --data --data-raw --data-binary --data-urlencode --json -F --form -T --upload-file` is present.
  - `wget`: mutation on a `--method=` other than GET or HEAD, or on `--post-data`, `--post-file`, `--body-data`, or `--body-file`.
  - `invoke-restmethod`/`irm`/`invoke-webrequest`/`iwr`: mutation on a `-Method` (case-insensitive) other than get or head, or on `-Body`/`-InFile`.
  - `sqlcmd`/`invoke-sqlcmd`/`bcp`/`osql`: always a mutation. The detail appends `; use the agent-sql-server MCP query_sql for reads`.
- **MCP** (`classifyMcpTool`): null only for names matching one of these:
  - `/^mcp__agent_sql_server_(?:list_connections|query_sql)$/`
  - `/^mcp__airflow_(?:dev|tst|prd)_(?:diagnose_dag_run|explore_dag|get_[a-z0-9_]+|list_[a-z0-9_]+)$/`
  - `/^mcp__atlassian_(?:atlassianuserinfo|discover|executeread|getaccessibleatlassianresources|getconfluencecontent|getgraphcontext|getgraphobject|getjiraissue|getloomvideo|search|searchconfluence|searchjiraissuesusingjql)$/`

  Anything else: confirm/external-write, detail `MCP call outside the read-only allowlist (AGENTS.md: external services are read-only unless you explicitly permit): <name>`.
- **Manifest** (`classifyManifest`): the lowercased basename matches `/^(?:pyproject\.toml|requirements[^/]*\.(?:txt|in)|package\.json|packages\.txt|setup\.py|setup\.cfg|pipfile|environment\.ya?ml|uv\.lock)$/`. Result: confirm/dependency-add, detail `Dependency manifest edit (AGENTS.md: no new dependencies without explicit permission): <path>`.
- **Eval** (`classifyEval`), checked in order:
  1. `mode === "plan"`: block/planner-eval, detail `eval is disabled while plan mode is active (AGENTS.md: the planner never performs evaluation); gather facts with read, grep, glob, or scout subagents.`
  2. SPAWN `/\bsubprocess\b|\bos\.(?:system|popen|exec[lv]p?e?|spawn[lv]p?e?)\s*\(|\bBun\.(?:\$|spawn|spawnSync)\b|\bchild_process\b|\bexecSync\s*\(|\bspawnSync\s*\(|(?<![\w$])\$`/` together with PROGRAM `/\b(git|uv|pip3?|npm|pnpm|yarn|terraform|az|databricks|astro|curl|wget|sqlcmd|bcp|winget|choco|scoop)\b/`: confirm, with category git-mutation for `git`, dependency-add for uv/pip/npm/pnpm/yarn/winget/choco/scoop, and external-write otherwise. Detail: `eval code spawns <program>; prefer the bash tool so the command policy applies`.
  3. `/\bmcp__\w+/`: confirm/external-write, detail `eval code references an MCP tool`.
  4. `/\b(?:requests|httpx|session|client)\.(?:post|put|patch|delete)\s*\(|\bmethod\s*[:=]\s*["'](?:post|put|patch|delete)["']/i`: confirm/external-write, detail `eval code sends an HTTP write request`.

`extensions/policy-guard.ts` (default export `policyGuard(pi)`), one `tool_call` handler:
- Verdict source:
  - `bash`: `classifyCommand(input.command)`.
  - `eval`: `classifyEval(input.code, latestMode(branch))`.
  - When `mcpToolName(...)` is non-null: `classifyMcpTool(name)`.
  - Otherwise: the first non-null `classifyManifest(target.path)` over `mutationTargets`.
- Outcome:
  - No verdict: return `undefined`.
  - `block`: return `{ block: true, reason: "[policy-guard] " + detail }`.
  - `confirm` with `!ctx.hasUI`: return `{ block: true, reason: "[policy-guard] <category> needs explicit user approval, which this session cannot request: <detail>. Stop and report this step to the main agent or the user." }`.
  - `confirm` otherwise: `await ctx.ui.confirm("Policy guard: <category>", detail + "\n\n" + excerpt)`. The excerpt is the command, or `JSON.stringify(input)` capped at 2,000 chars. `true` allows the call. `false` returns `{ block: true, reason: "[policy-guard] The user declined: <detail>. Do not retry or work around it; ask the user how to proceed." }`.

### 4. Quality gate as code
`lib/gate-runner.ts` ports `agents/quality-gate.md` §0–7 (lines 54–111).

Exports:
- `GateStep = { group: "setup" | "python" | "terraform" | "sql" | "json" | "markdown" | "yaml"; command: string; cwd: string; outcome: "pass" | "fail" | "superseded" | "skipped" | "unavailable" | "needs-config"; detail: string }`
- `GateReport = { status: "pass" | "findings" | "blocked" | "skipped"; summary: string; steps: GateStep[]; blockers: Array<{ kind: "ci" | "config"; step: string; detail: string }>; findings: Array<{ step: string; detail: string }>; filesChangedByGate: string[] }`
- `runGate(exec: Exec, root: string, planStartedAt: string, signal: AbortSignal): Promise<GateReport>`

Changed files and groups:
- Changed files are the union of two sources. Keep only paths that still exist, repo-relative with `/` separators, and drop deletions.
  - `git status --porcelain=v1 -z --untracked-files=all`, parsed as `fingerprint()` does (`slice(3)`; after an R or C status, skip the next record);
  - `git log --since=<planStartedAt> --name-only --format= HEAD`, treated as empty on a nonzero exit.
- Hash each changed file (sha256) before any step. `filesChangedByGate` lists the files whose hash changed.
- Groups use lowercase basenames exactly as quality-gate.md §1 defines them. They run in order: python, terraform, sql, json, markdown, yaml.
- No matching group means status `skipped` with summary `no checked file types changed`.

Step execution:
- A thrown exec, or output matching `/Failed to spawn|not recognized as an internal or external command|No such file or directory|command not found|ENOENT/i`, is `unavailable`.
- `killed` is `fail` with detail `timed out or cancelled`.
- Timeouts are 300,000 ms, except 1,800,000 ms for `uv run pytest`.
- `detail`: stderr+stdout lines matching `/\S+:\d+(?::\d+)?/` (else all non-empty lines), joined by ` | `, capped at 300 chars.
- Args go straight to exec with no shell. `command` is the display string, with spaces quoted.

Python, per project directory:
- The project directory is the first directory at or above the file, up to `root`, that holds `pyproject.toml`, `databricks.yml`, `databricks.yaml`, `setup.cfg`, or `setup.py`; otherwise `root`. Directories run in sorted order.
- Steps:
  1. `uvx ruff format .`
  2. `uvx ruff check .`. If it fails, record it as `superseded`, run `uvx ruff check --fix .` (also `superseded`), then re-run `uvx ruff check .`; the re-run decides.
  3. `uvx ty check`
  4. `uv run pytest`, only when a `Bun.Glob` scan for `**/{test_*.py,*_test.py,conftest.py}` or `**/tests/**/*.py` finds a path outside `.venv/`, `node_modules/`, and `site-packages/`. Otherwise it is `skipped` ("no tests found"). Exit code 5 is `skipped` ("no tests collected").
- A deciding python step that ends `fail` or `unavailable` adds a `ci` blocker.

Terraform, only when a `*.tf` or `*.tfvars` file changed:
- Run `terraform version` first. If it fails, record that step as `unavailable` with the finding `terraform is not on PATH` and skip the rest of the group. A passing `terraform version` is not recorded.
- Per sorted directory with a changed `*.tf`: `terraform init -backend=false -input=false -no-color`, then `terraform validate -no-color`.
- Then, per directory with a changed `*.tf` or `*.tfvars`: `terraform fmt -no-color`.
- Failures are findings.

SQL (cwd `root`, all files in one invocation):
- Run `sqlfluff format <files>`. If its output contains `No dialect was specified`, both SQL steps are `needs-config`, and the blocker is `{ kind: "config", step: "sqlfluff", detail: "No SQLFluff dialect configured for: <files>. Needs a .sqlfluff with dialect = tsql or databricks." }`.
- Otherwise run `sqlfluff lint <files>`. On failure, record it as `superseded`, run `sqlfluff fix <files>` (`superseded`), and re-run lint, which decides.
- Failures are findings.

JSON (excluding `package-lock.json` and `npm-shrinkwrap.json`):
- Extra flags: none if `root` has `biome.json` or `biome.jsonc`; else `--use-editorconfig=true` if it has `.editorconfig`; else `--indent-style=space --indent-width=2`.
- Run `biome format --write --no-errors-on-unmatched --files-ignore-unknown=true <extra> <files>`.
- Then `biome lint --no-errors-on-unmatched --files-ignore-unknown=true <files>`. On failure, record it as `superseded`, run lint once with `--write` (`superseded`), and re-run without it, which decides.
- Failures are findings.

Markdown: `rumdl fmt --no-cache <files>`, then `rumdl check --no-cache <files>`. A nonzero exit is a finding.

YAML:
- Pass `-d relaxed` unless one of these exists: `root/.yamllint`, `root/.yamllint.yaml`, `root/.yamllint.yml`, env `YAMLLINT_CONFIG_FILE`, or `~/.config/yamllint/config`.
- Run `yamllint -f parsable [-d relaxed] <files>`. On exit 0, the detail is the count of `[warning]` lines. A nonzero exit is a finding.

Status and summary:
- `blocked` if there is any blocker; otherwise `findings` if there is any finding or any deciding `fail`/`unavailable`; otherwise `pass`. `superseded` steps never count.
- Summary: one clause per group that ran, `<group> ok` or `<group> <n> failing` (n counts deciding `fail`/`unavailable`/`needs-config` steps), joined by `; `.

`extensions/quality-gate.ts` changes (clean cutover; review and verdict logic untouched unless listed):
- Remove the agent-driven gate:
  - delete `GATE_AGENT`, `RUN_REQUEST`, the gate branch of `tool_result` (:391, :400-409), and the gate-`error` branch (:497-503);
  - `:393` becomes `if (reviewResults.length === 0) return;`;
  - remove `gate-not-run` and `gate-error` from `FinalOutcome` and `FINAL_NOTICES`;
  - `CYCLE_AGENTS = REVIEW_AGENTS`.
- Types: `GateStatus = "pass" | "findings" | "blocked" | "skipped"`, and `GateRunData = { markerId; id: string; status: GateStatus; fingerprint: string | null; report: GateReport }`. `id` comes from `crypto.randomUUID()` and replaces `toolCallId`.
- `session_stop`: replace :480-503. Keep :476-479 and the cap block :483-486.
  - If `gateStale` and `root === null`: append a run with `report = { status: "findings", summary: "not a git repository", steps: [], blockers: [], findings: [{ step: "setup", detail: "Not a git repository; changed files cannot be determined, so no checks ran." }], filesChangedByGate: [] }` and `fingerprint: null`, call `finalize(..., "findings")`, and return.
  - If `gateStale` otherwise:
    1. Notify `Quality gate: run <phaseRuns + 1>/<MAX_GATE_RUNS>`.
    2. `report = await runGate((c, a, o) => pi.exec(c, a, o), root, marker.timestamp, event.signal)`. If `event.signal.aborted`, return without appending.
    3. Append `GATE_RUN_ENTRY { markerId, id, status: report.status, fingerprint: await fingerprint(pi, ctx.cwd), report }`.
    4. On `blocked` or `findings`: `nudged.add(id)`, then return `{ decision: "block", reason: GATE_REPORT_REASON(report, phaseRuns + 1) }`.
    5. On `pass` or `skipped`: set `lastGate` to the new run and `current` to its fingerprint, then fall through to :505.
  - Else if `lastGate.status === "blocked"`: keep :489-496, keyed by `lastGate.id`.
  - Else if `lastGate.status === "findings"` and `!nudged.has(lastGate.id)`: add it and return `GATE_REPORT_REASON(lastGate.report, phaseRuns)`. This path serves resumed sessions.
- `GATE_REPORT_REASON(report, n)`:
  - Opens with `[quality-gate] Run <n> of <MAX_GATE_RUNS>: <summary>.`
  - Then these sections, each only when non-empty, one `- <step>: <detail>` line per item:
    - `CI blockers (never ignore; fix them, then end your turn so the gate re-runs):`
    - `Config blockers (fix the configuration each line names, or report it to the user):`
    - `Findings (your call; fix what matters or list them in your final summary):`
    - `Reformatted by the gate: <files>.`
  - Closes with `If a CI blocker cannot be fixed within this plan, end your turn with an explicit BLOCKED report giving the failing command and error. Never silence tools with suppressions or config changes unless the plan calls for it.`
- Wording:
  - `BLOCKED_REASON`: "Fix them and run the gate again (run k+1 of 3)" becomes "Fix them and end your turn; the gate re-runs automatically (run k+1 of 3)".
  - `CAP_REASON`: "Do not run the gate again." becomes "The gate will not re-run."
- `reviewKb(pi, root): Promise<{ code: string[]; entropy: string[] }>`:
  1. `skills = loadKbSkills(join(import.meta.dir, "..", "skills")).skills`.
  2. `repo = await resolveRepo(exec, root)`.
  3. `index = await buildIndex(exec, repo, skills)`. When `serializeIndex(index)` differs from the file on disk, write it.
  4. Changed files are `git diff --name-only -z` plus `git ls-files --others --exclude-standard -z`. Skip missing paths, `uv.lock`, `package-lock.json`, `poetry.lock`, `*.lock`, and paths under `__pycache__/`, `.pytest_cache/`, `.ruff_cache/`, `.venv/`, or `node_modules/`.
  5. `code` = the union of `areaFor(index, path).domains` over changed files, sorted. `entropy` = the names of commit-bound skills.
  6. If `resolveRepo` returns null: `code` = every `files`-gate KB, and `entropy` = the commit-bound skills.
- Due reviews (:521-535):
  - `ReviewItem` gains `kb: string`.
  - `code-review` is not due when it has no run and `code` is empty.
  - Task lines read `Review the unstaged changes. repo_root: <root>. review_run: <run> of 5. kb: <names joined ", " or none>. dismissed: <dismissed>.`, with `code` names for code-review and `entropy` names for entropy-review.
- Delete `agents/quality-gate.md`.
- Update the stale citations:
  - `skills/databricks-platform/sources.md:15`: `~/.omp/agent/agents/quality-gate.md` becomes `~/.omp/agent/extensions/lib/gate-runner.ts`.
  - `skills/airflow/sources.md:15`: `quality-gate agent` becomes `quality-gate extension`.

### 5. Review agents take KBs from the `kb:` request
The domain-router injects the KBs named in each reviewer's `kb:` input at the child's first prompt, so agent files list no KB names.
- `agents/code-review.md`:
  - Description: "the domain router selects" becomes "the quality gate selects from the project index".
  - Inputs gain `kb`: comma-separated KB names for the changed files' areas, or `none`.
  - Delegating reads, first sentence: `You judge; scout subagents read. Read the unstaged changes yourself; the KB indexes named in kb are preloaded; delegate every other read to scouts:`.
  - §2 bullets 1–3 become:
    - `The KB indexes named in kb are preloaded in your context. Apply each, honoring its own Gate/Skip clauses.`
    - `For each applied index, fan out one scout per topic file that index selects for the changed files and content (unchanged instructions).`
    - ``kb is none, or every applied index skips: yield status `skipped`, summary `No domain KB applies to the unstaged changes.`, empty findings and suggestions, and kbsRead listing the applied skill:// URIs.``
  - Report `kbsRead`: `every skill:// URI applied: the preloaded indexes named in kb plus topic files you or your scouts read`.
- `agents/entropy-review.md`:
  - Inputs gain `kb`: the commit-bound KB names, preloaded.
  - Delegating reads: "Read the unstaged changes and `skill://coding-entropy` yourself" becomes "Read the unstaged changes yourself; the KBs named in kb are preloaded".
  - §1: "Read `skill://coding-entropy` in full yourself first. Its Keep test…" becomes "The KBs named in kb are preloaded in your context. Their Keep test…".

### 6. Rules
- In every `rules/*.md` matching `^interruptMode: never$`, set `interruptMode: tool-only`. Exception: `rules/py-uv-not-pip.md`, which is bash-scoped. That is 46 files: `grep -l '^interruptMode: never$' rules/*.md` minus that one.
- Add three TTSR rules for the AGENTS.md comment rule.
  - Shared by all three: `interruptMode: tool-only`, and this body:
    - First line: `AGENTS.md: inline comments only when absolutely required; if code needs a comment to explain what it does, rename or restructure it instead.`
    - Bullets:
      - `Keep existing comments you did not write; this rule targets comments you add.`
      - `Allowed: shebangs, encoding lines, license headers the repo requires, docstrings, notebook cell markers, and tool directives the repo already uses.`
      - `A comment is justified only for a non-obvious why (external constraint, linked workaround), never a what.`
  - `rules/no-inline-comments-hash.md`:
    - description `"AGENTS.md: no new comments unless absolutely required (# languages)"`
    - condition `'(?m)^[ \t]*#(?!!)(?![ \t]*(?:-\*-|type:|noqa|pragma|fmt:|ruff:|pyright:|mypy:|region\b|endregion\b|Databricks notebook source|COMMAND|MAGIC))'`, `'(?m)\S[ \t]{2,}#[ \t]'`
    - scope `"tool:edit(*.{py,pyi,ps1,psm1,sh,tf,tfvars}), tool:write(*.{py,pyi,ps1,psm1,sh,tf,tfvars})"`
  - `rules/no-inline-comments-slash.md`:
    - description `"AGENTS.md: no new comments unless absolutely required (// languages)"`
    - condition `'(?m)^[ \t]*//(?![/!])(?![ \t]*(?:@ts-|eslint-|biome-ignore|#region|#endregion))'`, `'(?m)^[ \t]*/\*(?!\*)'`, `'(?m)[;{}()\]][ \t]+//[ \t]'`
    - scope `"tool:edit(*.{ts,tsx,js,jsx,mjs,cjs,tf}), tool:write(*.{ts,tsx,js,jsx,mjs,cjs,tf})"`
  - `rules/no-inline-comments-sql.md`:
    - description `"AGENTS.md: no new comments unless absolutely required (SQL)"`
    - condition `'(?m)^[ \t]*--(?![ \t]*(?:sqlfluff:|noqa|Databricks notebook source|COMMAND|MAGIC))'`, `'(?m)\S[ \t]+--[ \t]'`, `'(?m)^[ \t]*/\*'`
    - scope `"tool:edit(*.sql), tool:write(*.sql)"`

### Execution slices
Step 1 runs first. Then these run in parallel:
- Slice A: step 2. It owns `lib/skills.ts`, `lib/project-index.ts`, `extensions/domain-router.ts`, `rules/domain-router.md`, and the six `SKILL.md` `kb` blocks.
- Slice B: step 3.
- Slice C: steps 4 and 5. It consumes Slice A's signatures as fixed above: `loadKbSkills`, `resolveRepo`, `buildIndex`, `serializeIndex`, `areaFor`.
- Slice D: step 6, mechanical edits.

Verification runs after all four slices land.

## Critical files & anchors
- `extensions/quality-gate.ts`:
  - `session_stop` :434-539 (gate branch :476-503 replaced)
  - `tool_result` :384-432 (gate recording removed)
  - `RUN_REQUEST` :266-268 (deleted)
  - `REVIEW_REQUEST` :297-304 (gains `kb`)
- `agents/quality-gate.md` :54-111: command table ported into `lib/gate-runner.ts`, then the file is deleted.
- `agents/code-review.md` :45-82: Inputs, Delegating reads, §2, and Report `kbsRead` are rewritten.
- `skills/*/SKILL.md` frontmatter: the only home of domain names and routing rules after this change.
- omp://extensions.md, the contracts the new handlers rely on:
  - :205-215 `sendMessage` delivery
  - :343-361 `before_agent_start`
  - :367-379 tool events
  - :435-456 tool_call context rules

## Verification
Scratch files live under `$TEMP/omp-determinism/`. `S=$TEMP/omp-determinism/sessions`. Fixtures are built by a throwaway `bun` script that runs git through `Bun.spawnSync`, so no guarded tool call is needed.

1. **Fixtures.** `bun run $TEMP/omp-determinism/setup.ts` builds the repos below. Each gets `git init`, then `git add -A` and `git -c user.name=smoke -c user.email=smoke@example.invalid commit -m init`.
   - `fy`, with no `.gitignore` and no `.omp/`:
     - `pyproject.toml` = `[project]\nname = "fy"\nversion = "0.0.0"\nrequires-python = ">=3.12"\n`
     - `README.md` = `# fy\n\nSmoke fixture with a Python package and Terraform infra.\n`
     - `src/app.py` = `import os\n\n\ndef total(values: list[int]) -> int:\n    return sum(values) + "0"\n`
     - `tests/test_app.py` = `from src.app import total\n\n\ndef test_total() -> None:\n    assert total([1, 2]) == 3\n`
     - `infra/main.tf` = `terraform {\nrequired_version = ">= 1.5.0"\n}\n`
     - `infra/modules/m/main.tf` = `variable "x" {\n  type = string\n}\n`
     - `.azure-pipelines/tf.yml` = `steps:\n  - script: terraform plan\n`
     - `data_platform/transforms/silver/sql/snapshot_legacy_x.sql` = `SELECT 1\n`
     - `docs/README.md` = `# docs\n\nProject documentation.\n`
     - Then `git worktree add --detach $TEMP/omp-determinism/fy-wt`.
   - `fz`: `.gitignore` = `.omp/\n` and `src/app.py` = `X = 1\n`.
2. **Syntax, load, and startup prehook.**
   - `bun build extensions/domain-router.ts extensions/policy-guard.ts extensions/quality-gate.ts --target=bun --outdir=$TEMP/omp-determinism/build --external "@oh-my-pi/*"` exits 0 (cwd `~/.omp/agent`).
   - `omp -p --no-session "Reply with OK"` in `fy` prints OK with no extension error. Afterwards:
     - `fy/.omp/project-index.yaml` exists;
     - `fy/.gitignore` is exactly `/.omp/project-index.yaml\n`;
     - `git -C fy status --porcelain` lists `?? .gitignore` and nothing under `.omp/`.
   - A second run in `fy` leaves `.gitignore` with one line and the index text byte-identical.
   - One run in `fz` leaves `fz/.gitignore` at `.omp/\n` and creates `fz/.omp/project-index.yaml`.
3. **Generator, contract, and elasticity.** A throwaway script importing `lib/skills.ts` and `lib/project-index.ts`.
   - `loadKbSkills(~/.omp/agent/skills)` gives names `[airflow, coding-entropy, databricks-platform, databricks-silver-modeling, python, terraform]`, with `coding-entropy.gate === "commit-bound"` and `errors: []`.
   - `Bun.YAML.parse(fy/.omp/project-index.yaml)` deep-equals the following, where `generator.commit` is fy's HEAD and `generator.rules` is 12 hex characters:

     `{ version: 1, generator: { name: "domain-router", commit, rules }, project: { name: "fy", synopsis: "Smoke fixture with a Python package and Terraform infra.", synopsisSource: "README.md" }, domains: [{ name: "python", files: 3 }, { name: "terraform", files: 3 }], map: [...] }`

     The `map` array, in this order:

     | path | files | types | readme | domains | topics |
     |---|---|---|---|---|---|
     | `./` | 3 | `{"(none)":1,".md":1,".toml":1}` | `Smoke fixture with a Python package and Terraform infra.` | [python] | [python/packaging.md] |
     | `.azure-pipelines/` | 1 | `{".yml":1}` | null | [terraform] | [terraform/pipelines.md] |
     | `data_platform/` | 1 | `{".sql":1}` | null | [] | [] |
     | `docs/` | 1 | `{".md":1}` | `Project documentation.` | [] | [] |
     | `infra/` | 2 | `{".tf":2}` | null | [terraform] | [terraform/language.md, terraform/modules.md] |
     | `src/` | 1 | `{".py":1}` | null | [python] | [] |
     | `tests/` | 1 | `{".py":1}` | null | [python] | [python/testing.md] |

   - `validateIndex` returns no errors for that object. Adding a top-level key `extra`, or setting `map[0].files` to `"3"`, gives exactly one error each.
   - `areaFor(index, "infra/modules/m/main.tf").path === "infra/"`, `areaFor(index, "pyproject.toml").path === "./"`, and `areaFor(index, "newdir/x.py") === null`.
   - `ensureGitignored(fy)` and `ensureGitignored(fz)` both return `false`.
   - `resolveRepo(fy-wt)` gives `mainRoot` = fy and `worktreeRoot` = fy-wt.
   - Elasticity: copy the skills directory to `$TEMP/omp-determinism/skills`, add `smoke-kb/SKILL.md` with frontmatter `name: smoke-kb`, `description: smoke`, and `kb: { files: ['**/*.md'] }`, then call `buildIndex(fy)` with that directory. `domains` now includes `{ name: "smoke-kb", files: 2 }`, and the `docs/` area lists `smoke-kb`. No code changed.
4. **Classifier table.** A throwaway script importing `lib/policy.ts`. `C:` = confirm, `B:` = block.
   - null: `git status`, `git -C r diff --stat`, `git pull --rebase`, `git checkout --theirs a.py`, `git branch -a`, `git stash list`, `uv sync`, `uv run pytest`, `uvx ruff check .`, `npm install`, `terraform init -backend=false -input=false`, `terraform validate`, `az account show`, `az pipelines runs list`, `databricks jobs list`, `databricks api get /api/2.0/clusters/list`, `astro dev parse`, `astro deployment list`, `curl https://x`
   - C:git-mutation: `git branch feature/x`, `cd r && git add -A && git commit -m "x; y"`, `bash -c "git push origin main"`, `& "C:\Program Files\Git\bin\git.exe" push`, `git stash`
   - C:dependency-add: `uv add httpx`, `npm i lodash`
   - B:python-without-uv: `python -m pytest`, `pip install x`
   - C:external-write: `terraform -chdir=infra plan`, `terraform init`, `az storage blob upload -f x`, `az rest --method post --url u`, `databricks bundle deploy -t dev`, `astro deploy`, `curl -X POST https://x`, `curl -d a=1 https://x`, `sqlcmd -Q "select 1"`
   - MCP null: `mcp__atlassian_getjiraissue`, `mcp__airflow_tst_list_dags`, `mcp__agent_sql_server_query_sql`
   - MCP C:external-write: `mcp__atlassian_createjiraissue`, `mcp__airflow_prd_trigger_dag`, `mcp__databricks_sql_dev_execute_sql`
   - Manifest: `C:/x/pyproject.toml` → C:dependency-add; `src/app.py` → null.
   - Eval: `("print(1)", "plan")` → B:planner-eval; `('import subprocess; subprocess.run(["git","push"])', "none")` → C:git-mutation; `("print(1+1)", "none")` → null.
5. **Gate runner.** A throwaway script calls `runGate` with a `Bun.spawn` adapter, `root = fy`, and `planStartedAt = "2000-01-01T00:00:00Z"`. Expect:
   - python steps in this order: ruff format; ruff check (`superseded`); ruff check --fix (`superseded`); ruff check (`pass`); ty (`fail`); pytest (`unavailable` or `fail`);
   - terraform init and validate for `infra` and `infra/modules/m`, then fmt for both;
   - `status === "blocked"`, with blockers ty (ci), pytest (ci), and sqlfluff (config);
   - `filesChangedByGate` ⊇ {`src/app.py`, `infra/main.tf`}.
6. **JIT end-to-end.** cwd `fy`, a fresh `--session-dir` under `$S` for each prompt, and `omp -p --mode json`. Checks use the grep tool on the session JSONL.
   - (a) `Read tests/test_app.py and reply with its first line only.` The first `jpollock.domain-router.kb` message has keys `[project:<fy normalized>]` and contains `KB catalog:`. The read's message has keys `[python, python/testing.md]`.
   - (b) `Read infra/modules/m/main.tf and reply with its first line only.` The read's keys are `[terraform, terraform/language.md, terraform/modules.md]`.
   - (c) `Create the file src/new_mod.py whose entire content is: X = 1`. A write result contains `[domain-router] Blocked once`, its KB keys include `python` and `coding-entropy`, and a later write succeeds.
   - (d) `Overwrite .omp/project-index.yaml with exactly the text: version: 2`. The result contains `is generated at startup from skill kb rules`, and the index file is unchanged.
7. **Guard end-to-end, headless** (cwd `fy`, a fresh `--session-dir` each):
   - `Run exactly this bash command and report its output: git commit --allow-empty -m smoke` → the result contains `[policy-guard] git-mutation needs explicit user approval`, and `git -C fy rev-list --count HEAD` prints `1`.
   - `Run exactly: python -c "print(1)"` → the result contains `Python runs only through uv`.
   - `Call xd://mcp__agent_sql_server_setup_config with {}` → the result contains `MCP call outside the read-only allowlist`.
8. **Plan mode.** Write `$TEMP/omp-determinism/plan.yml` = `plan:\n  defaultOnStartup: true\n`, then run `omp -p --config $TEMP/omp-determinism/plan.yml --session-dir $S/plan "Use the eval tool to run print(1+1)"` (cwd `fy`). The orientation message precedes the first tool call, and the eval result contains `eval is disabled while plan mode is active`.
9. **Quality gate end-to-end.**
   - Throwaway extension `$TEMP/omp-determinism/plan-marker.ts`:

     `export default function (pi) { pi.on("session_start", () => pi.sendMessage({ customType: "plan-yolo-handoff", content: "smoke plan approved", display: false }, { deliverAs: "nextTurn" })); }`
   - Run `omp -p --mode json --max-time 15m --session-dir $S/gate -e $TEMP/omp-determinism/plan-marker.ts "In src/app.py add def add(a: int, b: int) -> int returning a + b, then finish."` (cwd `fy`).
   - The JSONL holds:
     - a `jpollock.quality-gate.run` entry whose `data.report.steps` covers the step-5 commands;
     - a block reason starting `[quality-gate] Run 1 of 3`;
     - a closing `jpollock.quality-gate.final` with `blocked` or `cap-reached`.
10. **TTSR tool-only** (cwd `fy`). `omp -p --mode json --session-dir $S/ttsr "Append this exact line to src/app.py: from typing import List"` → a `ttsr_injection` entry names `py-builtin-generics`, and an aborted assistant stream comes before the first edit result.
11. **Manual, interactive (user).**
    - In a TUI session in `fy`, ask for `git commit --allow-empty -m manual`. The `Policy guard: git-mutation` dialog appears. Declining yields `[policy-guard] The user declined`; approving runs the commit.
    - Start a TUI session in plan mode in a fresh copy of `fz` with its `.omp/` deleted. The index is regenerated before the first planning tool call runs.

## Assumptions & contingencies
- Assumptions (override if unwanted):
  - The first prompt receives orientation and the KB catalog only. KB bodies load on first touch of an area or on a matching command or MCP call.
  - The index is regenerated at every main-session start, and it is rewritten only when its text changes. It is also rebuilt, at most once per turn, when a touched path falls outside every area, and by the quality gate before reviews. Plans therefore never carry index-update steps.
  - Repos touched outside the startup repo get an in-memory index only: no file writes and no `.gitignore` edit.
  - The `kb` rules listed in step 2a are the initial routing data. Adding or changing a KB means editing only skill folders.
  - Model writes to the index file are blocked, because it is a generated artifact.
  - Caps:
    - content probes: ≤256 KiB per file, ≤5,000 files per probe;
    - map: depth ≤3, ≤150 areas;
    - orientation: ≤60 areas.
  - Quality-gate check groups stay in code. KB skills do not declare gate checks.
  - The dependency guard also confirms edits to dependency manifests. The eval guard is coarse.
  - Headless main sessions (print, RPC `--no-ui`) are treated like subagents by the guard.
  - Three inline-comment TTSR rules are added, and `rules/py-uv-not-pip.md` stays `never`.
- Contingencies:
  - Verification 2 reports load errors for `extensions/lib/*.ts`: move `lib/` to `~/.omp/agent/extension-lib/` and import from `../extension-lib/<file>.ts`.
  - `Bun.YAML` is absent in omp's runtime (Verification 2 or 3 fails on parse or stringify):
    - Move each skill's `kb` block into `skills/<name>/kb.json`, with the same structure, and read it with `JSON.parse`.
    - Write the index with `JSON.stringify(index, null, 2) + "\n"`, which is valid YAML 1.2, and read it with `JSON.parse`.
    - Get the `databricks.yml` bundle name from `^\s*name:\s*(\S+)` under `^bundle:`.
  - `Bun.Glob` rejects `{a,b}` braces (Verification 3 shows missing probe matches): expand braces into separate patterns before compiling.
  - Verification 6 shows no `jpollock.domain-router.kb` message after a returned `before_agent_start` message: call `pi.sendMessage(msg, { deliverAs: "steer" })` inside that handler instead.
  - No KB message appears after an `aside` send (Verification 6):
    - For reads, append the KB text to the tool result: `{ content: [...event.content, { type: "text", text }] }`.
    - For blocks, put it in the block reason.
    - Record delivery with `pi.appendEntry("jpollock.domain-router.delivered", { keys })`, and read those entries after `contextStart`.
  - Verification 2 writes no index for the main print session (the `session_init` child test misfired): switch the child test to `!ctx.hasUI`. Main-session writes then happen only in interactive sessions, and Verification 2 moves to the manual step.
  - `git rev-parse --path-format` is rejected (git < 2.31): make separate `--show-toplevel` and `--git-common-dir` calls, resolving a relative common dir against the worktree root.
  - `pi.getActiveTools()` returns objects: compare on `.name`.
  - Verification 7's MCP call runs without a `[policy-guard]` result: add `tools.approval` entries set to `prompt` in `config.yml` for the names below. If the device is not mounted in print mode, do the check manually in step 11.
    - `mcp__airflow_{dev,tst,prd}_{clear_dag_run,clear_task_instances,delete_dag_run,pause_dag,unpause_dag,trigger_dag,trigger_dag_and_wait}`
    - `mcp__atlassian_{addgraphcontext,addoreditjiraissuecomment,createconfluencecontent,createjiraissue,editjiraissue,executedestructive,executewrite,transitionjiraissue,updateconfluencecontent}`
    - `mcp__agent_sql_server_setup_config`
  - Verification 8 shows no `mode_change` to `plan` (print mode ignores the overlay): the step-4 `classifyEval(..., "plan")` result stands as proof, and the report states that plan mode was not exercised end-to-end.
  - Verification 9 shows no `plan-yolo-handoff` message: change the marker to `pi.on("before_agent_start", () => ({ message: { customType: "plan-yolo-handoff", content: "smoke plan approved", display: false } }))`. If `session_stop` never fires in print mode, report the gate state machine as verified by step 5 and the user's next approved plan.
  - The implementing session still runs the pre-rework `quality-gate.ts`. If its stop hook requests the deleted `quality-gate` agent, do not call it. End the turn with the verification evidence; the old hook finalizes after two unanswered requests.
