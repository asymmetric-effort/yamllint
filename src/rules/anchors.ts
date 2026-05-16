import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "anchors";
export const type = "token";

let declaredAnchors: Map<string, { line: number; col: number }>;
let usedAnchors: Set<string>;

export function reset(): void {
  declaredAnchors = new Map();
  usedAnchors = new Set();
}

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  _prev: YamlToken | undefined,
  _next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  _context: TokenContext,
): Generator<LintProblem> {
  if (!token) return;

  const forbidUndeclaredAliases = conf["forbid-undeclared-aliases"] as boolean;
  const forbidDuplicatedAnchors = conf["forbid-duplicated-anchors"] as boolean;
  const forbidUnusedAnchors = conf["forbid-unused-anchors"] as boolean;

  if (token.type === "anchor" && token.value) {
    if (forbidDuplicatedAnchors && declaredAnchors.has(token.value)) {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `found duplicate anchor "${token.value}"`,
      };
    }
    declaredAnchors.set(token.value, { line: token.startLine, col: token.startCol });
  } else if (token.type === "alias" && token.value) {
    usedAnchors.add(token.value);
    if (forbidUndeclaredAliases && !declaredAnchors.has(token.value)) {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `found undeclared alias "${token.value}"`,
      };
    }
  }

  // At stream-end, check for unused anchors
  if (token.type === "stream-end" && forbidUnusedAnchors) {
    for (const [name, pos] of declaredAnchors) {
      if (!usedAnchors.has(name)) {
        yield {
          line: pos.line,
          column: pos.col,
          rule: id,
          level: "error",
          message: `found undeclared alias "${name}"`,
        };
      }
    }
  }
}
