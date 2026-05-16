import type { LintProblem, OutputFormat } from "./types.js";

export interface FormatOptions {
  format: OutputFormat;
  filename: string;
  noWarnings: boolean;
}

export function formatProblems(problems: LintProblem[], options: FormatOptions): string {
  const { format, filename, noWarnings } = options;

  const filtered = noWarnings ? problems.filter((p) => p.level === "error") : problems;

  if (filtered.length === 0) return "";

  const resolvedFormat = resolveFormat(format);

  switch (resolvedFormat) {
    case "parsable":
      return formatParsable(filtered, filename);
    case "github":
      return formatGithub(filtered, filename);
    case "colored":
      return formatColored(filtered, filename);
    case "standard":
    default:
      return formatStandard(filtered, filename);
  }
}

function resolveFormat(format: OutputFormat): OutputFormat {
  if (format !== "auto") return format;

  // Detect GitHub Actions
  if (process.env.GITHUB_ACTIONS || process.env.GITHUB_WORKFLOW) {
    return "github";
  }

  // Detect color support
  if (
    process.stdout.isTTY &&
    (process.env.TERM !== "dumb" || process.env.FORCE_COLOR)
  ) {
    return "colored";
  }

  return "standard";
}

function formatParsable(problems: LintProblem[], filename: string): string {
  return problems
    .map((p) => {
      const ruleStr = p.rule ? ` (${p.rule})` : "";
      return `${filename}:${p.line}:${p.column}: [${p.level}] ${p.message}${ruleStr}`;
    })
    .join("\n");
}

function formatStandard(problems: LintProblem[], filename: string): string {
  const lines = [`${filename}`];
  for (const p of problems) {
    const ruleStr = p.rule ? ` (${p.rule})` : "";
    lines.push(`  ${p.line}:${p.column}      ${p.level}  ${p.message}${ruleStr}`);
  }
  return lines.join("\n");
}

function formatColored(problems: LintProblem[], filename: string): string {
  const RESET = "\x1b[0m";
  const RED = "\x1b[31m";
  const YELLOW = "\x1b[33m";
  const CYAN = "\x1b[36m";
  const BOLD = "\x1b[1m";

  const lines = [`${BOLD}${filename}${RESET}`];
  for (const p of problems) {
    const color = p.level === "error" ? RED : YELLOW;
    const ruleStr = p.rule ? ` ${CYAN}(${p.rule})${RESET}` : "";
    lines.push(
      `  ${p.line}:${p.column}      ${color}${p.level}${RESET}  ${p.message}${ruleStr}`,
    );
  }
  return lines.join("\n");
}

function formatGithub(problems: LintProblem[], filename: string): string {
  const lines: string[] = [];

  if (problems.length > 0) {
    lines.push(`::group::${filename}`);
  }

  for (const p of problems) {
    const ghLevel = p.level === "error" ? "error" : "warning";
    const ruleStr = p.rule ? ` (${p.rule})` : "";
    lines.push(
      `::${ghLevel} file=${filename},line=${p.line},col=${p.column}::${p.line}:${p.column} [${p.level}] ${p.message}${ruleStr}`,
    );
  }

  if (problems.length > 0) {
    lines.push("::endgroup::");
  }

  return lines.join("\n");
}

export function hasErrors(problems: LintProblem[]): boolean {
  return problems.some((p) => p.level === "error");
}

export function hasWarnings(problems: LintProblem[]): boolean {
  return problems.some((p) => p.level === "warning");
}
