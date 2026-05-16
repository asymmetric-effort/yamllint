import type { LintProblem } from "./types.js";

export interface DisabledRange {
  startLine: number;
  endLine: number | null; // null = until end of file
  rules: string[] | null; // null = all rules
}

export function parseDirectives(source: string): {
  disabledLines: Map<number, Set<string> | null>;
  disabledFile: boolean;
} {
  const disabledLines = new Map<number, Set<string> | null>();
  let disabledFile = false;
  const disableBlocks: { rules: Set<string> | null }[] = [];

  const lines = source.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for yamllint directives in comments
    const commentMatch = line.match(/#\s*yamllint\s+(.*)/);
    if (!commentMatch) continue;

    const directive = commentMatch[1].trim();

    if (directive === "disable-file") {
      disabledFile = true;
      break;
    }

    if (directive.startsWith("disable-line")) {
      const rules = parseRuleList(directive.slice("disable-line".length));
      disabledLines.set(lineNum, rules);
      continue;
    }

    if (directive.startsWith("disable")) {
      const rules = parseRuleList(directive.slice("disable".length));
      disableBlocks.push({ rules });
      continue;
    }

    if (directive.startsWith("enable")) {
      const rules = parseRuleList(directive.slice("enable".length));
      if (disableBlocks.length > 0) {
        const block = disableBlocks.pop()!;
        // Mark all lines between disable and enable
        // This is handled differently - we track active blocks
      }
      continue;
    }
  }

  // Now do a second pass to build disabled line sets from block directives
  let activeDisables: { startLine: number; rules: Set<string> | null }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const commentMatch = line.match(/#\s*yamllint\s+(.*)/);
    if (commentMatch) {
      const directive = commentMatch[1].trim();

      if (directive.startsWith("disable-line")) {
        // Already handled above
      } else if (directive.startsWith("disable") && !directive.startsWith("disable-file")) {
        const rules = parseRuleList(directive.slice("disable".length));
        activeDisables.push({ startLine: lineNum, rules });
      } else if (directive.startsWith("enable")) {
        const rules = parseRuleList(directive.slice("enable".length));
        if (rules === null) {
          // Enable all - remove all active disables
          activeDisables = [];
        } else {
          // Remove matching disables
          activeDisables = activeDisables.filter((d) => {
            if (d.rules === null) return true;
            for (const r of rules) d.rules.delete(r);
            return d.rules.size > 0;
          });
        }
      }
    }

    // Apply active disables to this line
    for (const disable of activeDisables) {
      if (disable.rules === null) {
        disabledLines.set(lineNum, null);
      } else {
        const existing = disabledLines.get(lineNum);
        if (existing === null) continue; // already all disabled
        const set = existing || new Set<string>();
        for (const r of disable.rules) set.add(r);
        disabledLines.set(lineNum, set);
      }
    }
  }

  return { disabledLines, disabledFile };
}

function parseRuleList(str: string): Set<string> | null {
  const trimmed = str.trim();
  if (!trimmed) return null; // null means all rules

  const rules = new Set<string>();
  const matches = trimmed.matchAll(/rule:(\S+)/g);
  for (const match of matches) {
    rules.add(match[1]);
  }

  return rules.size > 0 ? rules : null;
}

export function isDisabled(
  disabledLines: Map<number, Set<string> | null>,
  line: number,
  rule: string | null,
): boolean {
  const disabled = disabledLines.get(line);
  if (disabled === undefined) return false;
  if (disabled === null) return true; // all rules disabled
  if (rule === null) return false;
  return disabled.has(rule);
}

export function filterProblems(
  problems: LintProblem[],
  disabledLines: Map<number, Set<string> | null>,
  disabledFile: boolean,
): LintProblem[] {
  if (disabledFile) return [];
  return problems.filter((p) => !isDisabled(disabledLines, p.line, p.rule));
}
