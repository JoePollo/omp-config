const TOKEN_PATTERN = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g;
const SEGMENT_PATTERN = /("(?:[^"\\]|\\.)*")|('(?:[^']*)')|(?:&&|\|\||[;|&\n`()]|\$\()/g;
const ASSIGNMENT_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*=/;
const WRAPPERS: Record<string, true> = { sudo: true, env: true, command: true, time: true, nohup: true, exec: true, call: true };
const SHELL_PROGRAMS: Record<string, true> = { bash: true, sh: true, zsh: true, dash: true };

export function programName(token: string): string {
  const basename = token.slice(Math.max(token.lastIndexOf("/"), token.lastIndexOf("\\")) + 1).toLowerCase();
  return basename.replace(/\.(?:exe|cmd|bat|ps1)$/, "");
}

export function commandSegments(command: string): string[][] {
  const segments: string[][] = [];
  appendSegments(command, segments);
  return segments;
}

function splitSegments(command: string): string[] {
  const segments: string[] = [];
  let start = 0;
  for (const match of command.matchAll(SEGMENT_PATTERN)) {
    if (match[1] !== undefined || match[2] !== undefined) continue;
    const index = match.index!;
    segments.push(command.slice(start, index));
    start = index + match[0].length;
  }
  segments.push(command.slice(start));
  return segments;
}

function appendSegments(command: string, segments: string[][]): void {
  for (const segment of splitSegments(command)) {
    const argv = Array.from(segment.matchAll(TOKEN_PATTERN), (match) => match[1] ?? match[2] ?? match[3] ?? "");
    stripLeadingWrappers(argv);
    if (argv.length === 0) continue;
    const program = programName(argv[0]);
    argv[0] = program;
    segments.push(argv);
    const flagIndex = shellCommandFlagIndex(program, argv);
    if (flagIndex >= 0 && argv[flagIndex + 1] !== undefined) appendSegments(argv[flagIndex + 1], segments);
  }
}

function stripLeadingWrappers(argv: string[]): void {
  while (argv.length > 0 && (ASSIGNMENT_PATTERN.test(argv[0] ?? "") || WRAPPERS[programName(argv[0] ?? "")] === true)) {
    const token = argv[0] ?? "";
    if (ASSIGNMENT_PATTERN.test(token)) {
      argv.shift();
      continue;
    }
    if (programName(argv.shift() ?? "") === "env") {
      while (argv[0]?.startsWith("-")) argv.shift();
    }
  }
}

function shellCommandFlagIndex(program: string, argv: string[]): number {
  if (SHELL_PROGRAMS[program] === true) return argv.findIndex((token, index) => index > 0 && /^-[a-z]*c[a-z]*$/.test(token));
  if (program === "pwsh" || program === "powershell") return argv.findIndex((token, index) => index > 0 && ["-c", "-command"].includes(token.toLowerCase()));
  if (program === "cmd") return argv.findIndex((token, index) => index > 0 && ["/c", "/k"].includes(token.toLowerCase()));
  return -1;
}
