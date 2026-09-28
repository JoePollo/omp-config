import { commandSegments } from "./shell.ts";

export type Category = "git-mutation" | "dependency-add" | "external-write" | "python-without-uv";
export type Verdict = { action: "confirm" | "block"; category: Category; detail: string };

const PYTHON_PROGRAM = /^(?:python(?:\d+(?:\.\d+)?)?|py|pip\d*(?:\.\d+)?|pipx)$/;
const JAVASCRIPT_INSTALL_VERBS = new Set(["install", "i", "add"]);
const PACKAGE_TOOLS = new Set(["npm", "pnpm", "bun"]);
const DIRECT_INSTALL_TOOLS = new Set(["install-module", "install-package", "install-psresource"]);
const SYSTEM_INSTALLS = new Map([
  ["winget", "install"],
  ["choco", "install"],
  ["scoop", "install"],
]);
const GIT_READS = new Set([
  "status", "diff", "log", "show", "blame", "annotate", "grep", "ls-files", "ls-tree", "ls-remote", "rev-parse", "rev-list", "describe", "shortlog", "cat-file", "for-each-ref", "name-rev", "merge-base", "check-ignore", "check-attr", "show-ref", "show-branch", "var", "version", "help", "fetch", "pull", "diff-tree", "diff-index", "diff-files", "range-diff", "whatchanged", "count-objects", "fsck", "cherry", "difftool", "mergetool", "archive",
]);
const GIT_GLOBAL_VALUE_OPTIONS = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace"]);
const GIT_REFLOG_MUTATIONS = new Set(["expire", "delete", "drop"]);
const GIT_ARG0_READS = new Map([
  ["stash", new Set(["list", "show"])],
  ["worktree", new Set(["list"])],
  ["lfs", new Set(["ls-files", "status", "env", "version"])],
]);
const GIT_EMPTY_OR_ARG0_READS = new Map([
  ["remote", new Set(["-v", "--verbose", "show", "get-url"])],
  ["submodule", new Set(["status", "summary"])],
  ["notes", new Set(["list", "show"])],
]);
const GIT_BRANCH_MUTATIONS = new Set(["-d", "-D", "--delete", "-m", "-M", "--move", "-c", "-C", "--copy", "-f", "--force", "-u", "--set-upstream-to", "--unset-upstream", "--edit-description", "-t", "--track", "--no-track"]);
const GIT_BRANCH_LISTS = new Set(["--list", "-l", "--show-current"]);
const GIT_TAG_MUTATIONS = new Set(["-d", "--delete", "-a", "--annotate", "-s", "--sign", "-u", "--local-user", "-f", "--force", "-m", "--message", "-F", "--file"]);
const GIT_TAG_LISTS = new Set(["-l", "--list"]);
const GIT_CHECKOUT_READS = new Set(["--ours", "--theirs"]);
const GIT_CONFIG_READS = new Set(["--get", "--get-all", "--get-regexp", "--get-urlmatch", "--list", "-l"]);
const READ_VERBS = new Set(["show", "list", "get", "query", "exists", "check", "download", "wait", "tail", "browse", "version", "logs", "ls", "cat", "export", "describe", "status", "summary", "validate", "me"]);
const TERRAFORM_MUTATIONS = new Set(["apply", "destroy", "import", "plan", "refresh", "query", "taint", "untaint", "force-unlock", "output", "show", "console", "state"]);
const TERRAFORM_SKIPS = new Set(["-help", "-version", "-v"]);
const TERRAFORM_WORKSPACE_MUTATIONS = new Set(["new", "delete", "select", "list"]);
const AZ_ROOT_READS = new Set(["login", "logout", "version", "help", "find", "config"]);
const AZ_ACTION_READS = new Map([
  ["account", new Set(["show", "list", "set", "get-access-token", "list-locations", "clear"])],
  ["extension", new Set(["list", "show", "list-available"])],
]);
const AZ_REST_READS = new Set(["get", "head"]);
const AZ_BODY_OPTIONS = new Set(["--body", "-b"]);
const DATABRICKS_ROOT_READS = new Set(["auth", "configure", "version", "help", "completion"]);
const DATABRICKS_ACTION_READS = new Map([
  ["bundle", new Set(["validate", "summary", "generate", "init", "schema", "open"])],
  ["api", new Set(["get", "head"])],
]);
const ASTRO_ROOT_READS = new Set(["dev", "run", "version", "login", "logout", "context", "completion", "help", "config"]);
const ASTRO_DEPLOYMENT_READS = new Set(["list", "inspect", "logs"]);
const ASTRO_WORKSPACE_READS = new Set(["list", "switch"]);
const CURL_DATA_OPTIONS = new Set(["-d", "--data", "--data-raw", "--data-binary", "--data-urlencode", "--json", "-F", "--form", "-T", "--upload-file"]);
const WGET_WRITE_OPTIONS = new Set(["--post-data", "--post-file", "--body-data", "--body-file"]);
const POWERSHELL_WEB_TOOLS = new Set(["invoke-restmethod", "irm", "invoke-webrequest", "iwr"]);
const POWERSHELL_WRITE_OPTIONS = new Set(["-body", "-infile"]);
const SQL_TOOLS = new Set(["sqlcmd", "invoke-sqlcmd", "bcp", "osql"]);
const MCP_READ_ALLOWLIST = [
  /^mcp__agent_sql_server_(?:list_connections|query_sql)$/,
  /^mcp__airflow_(?:dev|tst|prd)_(?:diagnose_dag_run|explore_dag|get_[a-z0-9_]+|list_[a-z0-9_]+)$/,
  /^mcp__atlassian_(?:atlassianuserinfo|discover|executeread|getaccessibleatlassianresources|getconfluencecontent|getgraphcontext|getgraphobject|getjiraissue|getloomvideo|search|searchconfluence|searchjiraissuesusingjql)$/,
];
const MANIFEST_BASENAME = /^(?:pyproject\.toml|requirements[^/]*\.(?:txt|in)|package\.json|packages\.txt|setup\.py|setup\.cfg|pipfile|environment\.ya?ml|uv\.lock)$/;

function verdict(action: Verdict["action"], category: Category, detail: string): Verdict {
  return { action, category, detail };
}

function dependencyDetail(line: string): Verdict {
  return verdict("confirm", "dependency-add", `New dependency (AGENTS.md: needs your explicit permission): ${line}`);
}

function externalDetail(line: string, suffix = ""): Verdict {
  return verdict("confirm", "external-write", `External-service write or live-state access (AGENTS.md: external services are read-only unless you explicitly permit): ${line}${suffix}`);
}

function hasNonFlagToken(argv: string[], start: number): boolean {
  for (let index = start; index < argv.length; index++) if (!argv[index].startsWith("-")) return true;
  return false;
}

function isJavaScriptDependencyAdd(argv: string[]): boolean {
  const program = argv[0];
  if (PACKAGE_TOOLS.has(program) && JAVASCRIPT_INSTALL_VERBS.has(argv[1])) return hasNonFlagToken(argv, 2);
  return program === "yarn" && argv[1] === "add" && hasNonFlagToken(argv, 2);
}

function isSystemDependencyAdd(argv: string[]): boolean {
  const install = SYSTEM_INSTALLS.get(argv[0]);
  return (install !== undefined && install === argv[1]) || (argv[0] === "az" && argv[1] === "extension" && argv[2] === "add") || DIRECT_INSTALL_TOOLS.has(argv[0]);
}

function classifyDependency(argv: string[], line: string): Verdict | null {
  if (argv[0] === "uv") {
    if (argv[1] === "add" || (argv[1] === "pip" && argv[2] === "install") || (argv[1] === "tool" && argv[2] === "install")) return dependencyDetail(line);
    return null;
  }
  if (isJavaScriptDependencyAdd(argv)) return dependencyDetail(line);
  return isSystemDependencyAdd(argv) ? dependencyDetail(line) : null;
}

function gitSubcommandIndex(argv: string[]): number {
  let index = 1;
  while (index < argv.length) {
    const token = argv[index];
    if (GIT_GLOBAL_VALUE_OPTIONS.has(token)) index += 2;
    else if (token.startsWith("--") || token === "-P" || token === "-p") index++;
    else break;
  }
  return index;
}

function hasNamedFlag(argv: string[], start: number, flags: Set<string>): boolean {
  for (let index = start; index < argv.length; index++) {
    const token = argv[index];
    const equals = token.indexOf("=");
    if (flags.has(equals === -1 ? token : token.slice(0, equals))) return true;
  }
  return false;
}

function allArgumentsAreFlags(argv: string[], start: number): boolean {
  for (let index = start; index < argv.length; index++) if (!argv[index].startsWith("-")) return false;
  return true;
}

function hasAnyToken(argv: string[], start: number, tokens: Set<string>): boolean {
  for (let index = start; index < argv.length; index++) if (tokens.has(argv[index])) return true;
  return false;
}

function isGitArgumentRead(subcommand: string, argv: string[], argsStart: number): boolean {
  if (subcommand === "reflog") return !GIT_REFLOG_MUTATIONS.has(argv[argsStart]);
  const allowed = GIT_ARG0_READS.get(subcommand);
  if (allowed) return allowed.has(argv[argsStart]);
  const emptyOrAllowed = GIT_EMPTY_OR_ARG0_READS.get(subcommand);
  return emptyOrAllowed !== undefined && (argsStart === argv.length || emptyOrAllowed.has(argv[argsStart]));
}

function isGitFlagRead(subcommand: string, argv: string[], argsStart: number): boolean {
  if (subcommand === "config") return argv[argsStart] === "get" || argv[argsStart] === "list" || hasAnyToken(argv, argsStart, GIT_CONFIG_READS);
  if (subcommand === "checkout") return hasAnyToken(argv, argsStart, GIT_CHECKOUT_READS);
  const mutations = subcommand === "branch" ? GIT_BRANCH_MUTATIONS : subcommand === "tag" ? GIT_TAG_MUTATIONS : null;
  if (!mutations) return false;
  const lists = subcommand === "branch" ? GIT_BRANCH_LISTS : GIT_TAG_LISTS;
  return !hasNamedFlag(argv, argsStart, mutations) && (allArgumentsAreFlags(argv, argsStart) || hasAnyToken(argv, argsStart, lists));
}

function isGitReadOnly(subcommand: string, argv: string[], argsStart: number): boolean {
  return GIT_READS.has(subcommand) || isGitArgumentRead(subcommand, argv, argsStart) || isGitFlagRead(subcommand, argv, argsStart);
}

function classifyGit(argv: string[], line: string): Verdict | null {
  const subIndex = gitSubcommandIndex(argv);
  const subcommand = argv[subIndex];
  if (!subcommand || isGitReadOnly(subcommand, argv, subIndex + 1)) return null;
  return verdict("confirm", "git-mutation", `Git mutation (AGENTS.md: all git operations except pull and merge-conflict resolution need your approval): ${line}`);
}

function classifyCommandSegment(argv: string[], line: string): Verdict | null {
  if (PYTHON_PROGRAM.test(argv[0])) return verdict("block", "python-without-uv", `Python runs only through uv (AGENTS.md): use \`uv run python …\`, \`uv run <tool>\`, or \`uvx <tool>\`; add dependencies with \`uv add\` (needs explicit permission). Blocked: ${line}`);
  const dependency = classifyDependency(argv, line);
  if (dependency) return dependency;
  if (argv[0] === "git") return classifyGit(argv, line);
  return classifyCloudCommand(argv, line) ?? classifyTransferCommand(argv, line) ?? classifyOtherExternalCommand(argv, line);
}

export function classifyCommand(command: string): Verdict | null {
  for (const argv of commandSegments(command)) {
    const result = classifyCommandSegment(argv, argv.join(" "));
    if (result) return result;
  }
  return null;
}

function isTerraformMutation(argv: string[]): boolean {
  let subIndex = 1;
  while (subIndex < argv.length && (argv[subIndex].startsWith("-chdir=") || TERRAFORM_SKIPS.has(argv[subIndex]))) subIndex++;
  const subcommand = argv[subIndex];
  if (TERRAFORM_MUTATIONS.has(subcommand)) return true;
  if (subcommand === "workspace") return TERRAFORM_WORKSPACE_MUTATIONS.has(argv[subIndex + 1]);
  return subcommand === "init" && !argv.includes("-backend=false", subIndex + 1);
}

function pathEnd(argv: string[]): number {
  let index = 1;
  while (index < argv.length && !argv[index].startsWith("-")) index++;
  return index;
}

function isReadVerb(token: string | undefined): boolean {
  return token !== undefined && (READ_VERBS.has(token) || token.startsWith("list-") || token.startsWith("show-") || token.startsWith("get-"));
}

function isActionRead(action: string | undefined, subaction: string | undefined, allowed: Map<string, Set<string>>): boolean {
  return allowed.get(action ?? "")?.has(subaction ?? "") ?? false;
}

function isOptionPresent(argv: string[], start: number, options: Set<string>): boolean {
  for (let index = start; index < argv.length; index++) {
    const equals = argv[index].indexOf("=");
    const option = equals === -1 ? argv[index] : argv[index].slice(0, equals);
    if (options.has(option)) return true;
  }
  return false;
}

function azRestIsRead(argv: string[]): boolean {
  let method = isOptionPresent(argv, 1, AZ_BODY_OPTIONS) ? "post" : "get";
  for (let index = 1; index < argv.length; index++) {
    const token = argv[index];
    if (token === "--method" || token === "-m") method = argv[index + 1] ?? "";
    else if (token.startsWith("--method=")) method = token.slice("--method=".length);
  }
  return AZ_REST_READS.has(method.toLowerCase());
}

function azIsRead(argv: string[]): boolean {
  const end = pathEnd(argv);
  if (end === 1 || AZ_ROOT_READS.has(argv[1]) || isActionRead(argv[1], argv[2], AZ_ACTION_READS)) return true;
  if (argv[1] === "rest" && azRestIsRead(argv)) return true;
  return isReadVerb(argv[end - 1]);
}

function databricksIsRead(argv: string[]): boolean {
  const end = pathEnd(argv);
  return end === 1 || DATABRICKS_ROOT_READS.has(argv[1]) || isActionRead(argv[1], argv[2], DATABRICKS_ACTION_READS) || isReadVerb(argv[end - 1]);
}

function astroIsRead(argv: string[]): boolean {
  if (ASTRO_ROOT_READS.has(argv[1])) return true;
  if (argv[1] === "deployment") return ASTRO_DEPLOYMENT_READS.has(argv[2]);
  return (argv[1] === "workspace" || argv[1] === "organization") && ASTRO_WORKSPACE_READS.has(argv[2]);
}
function classifyCloudCommand(argv: string[], line: string): Verdict | null {
  if (argv[0] === "terraform") return isTerraformMutation(argv) ? externalDetail(line) : null;
  if (argv[0] === "az") return azIsRead(argv) ? null : externalDetail(line);
  if (argv[0] === "databricks") return databricksIsRead(argv) ? null : externalDetail(line);
  if (argv[0] === "astro") return astroIsRead(argv) ? null : externalDetail(line);
  return null;
}

function isReadMethod(method: string | undefined): boolean {
  const normalized = method?.toLowerCase();
  return normalized === "get" || normalized === "head";
}

function curlHasMutatingMethod(argv: string[]): boolean {
  for (let index = 1; index < argv.length; index++) {
    const token = argv[index];
    if (token === "-X" || token === "--request") {
      const method = argv[index + 1];
      if (!isReadMethod(method)) return true;
      index++;
    } else if (token.startsWith("--request=")) {
      if (!isReadMethod(token.slice("--request=".length))) return true;
    } else if (token.startsWith("-X") && token.length > 2) {
      const method = token.startsWith("-X=") ? token.slice(3) : token.slice(2);
      if (!isReadMethod(method)) return true;
    }
  }
  return false;
}

function isCurlMutation(argv: string[]): boolean {
  return curlHasMutatingMethod(argv) || isOptionPresent(argv, 1, CURL_DATA_OPTIONS);
}

function wgetIsMutation(argv: string[]): boolean {
  for (let index = 1; index < argv.length; index++) {
    const token = argv[index];
    if (token.startsWith("--method=") && !isReadMethod(token.slice("--method=".length))) return true;
  }
  return isOptionPresent(argv, 1, WGET_WRITE_OPTIONS);
}

function classifyTransferCommand(argv: string[], line: string): Verdict | null {
  if (argv[0] === "curl") return isCurlMutation(argv) ? externalDetail(line) : null;
  if (argv[0] === "wget") return wgetIsMutation(argv) ? externalDetail(line) : null;
  return null;
}

function powershellIsMutation(argv: string[]): boolean {
  for (let index = 1; index < argv.length; index++) {
    const token = argv[index];
    const separator = token.search(/[:=]/);
    const name = (separator === -1 ? token : token.slice(0, separator)).toLowerCase();
    if (POWERSHELL_WRITE_OPTIONS.has(name)) return true;
    if (name === "-method") {
      const method = separator === -1 ? argv[index + 1] : token.slice(separator + 1);
      if (!isReadMethod(method)) return true;
      if (separator === -1) index++;
    }
  }
  return false;
}

function classifyOtherExternalCommand(argv: string[], line: string): Verdict | null {
  if (POWERSHELL_WEB_TOOLS.has(argv[0])) return powershellIsMutation(argv) ? externalDetail(line) : null;
  if (SQL_TOOLS.has(argv[0])) return externalDetail(line, "; use the agent-sql-server MCP query_sql for reads");
  return null;
}

export function classifyMcpTool(name: string): Verdict | null {
  for (const pattern of MCP_READ_ALLOWLIST) if (pattern.test(name)) return null;
  return verdict("confirm", "external-write", `MCP call outside the read-only allowlist (AGENTS.md: external services are read-only unless you explicitly permit): ${name}`);
}

export function classifyManifest(path: string): Verdict | null {
  const basename = path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1).toLowerCase();
  if (!MANIFEST_BASENAME.test(basename)) return null;
  return verdict("confirm", "dependency-add", `Dependency manifest edit (AGENTS.md: no new dependencies without explicit permission): ${path}`);
}

