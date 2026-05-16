import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "key-duplicates";
export const type = "token";

interface IndentLevel {
  keys: Set<string>;
  indent: number;
}

let levels: IndentLevel[] = [];

export function reset(): void {
  levels = [];
}

export function* check(
  _conf: RuleConf,
  token: YamlToken | undefined,
  prev: YamlToken | undefined,
  _next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  _context: TokenContext,
): Generator<LintProblem> {
  if (!token) return;

  if (token.type === "stream-start") {
    levels = [];
    return;
  }

  if (token.type === "flow-mapping-start") {
    levels.push({ keys: new Set(), indent: token.startCol });
    return;
  }

  if (token.type === "flow-mapping-end") {
    if (levels.length > 0 && levels[levels.length - 1].indent >= token.startCol) {
      levels.pop();
    }
    return;
  }

  // For block mappings, track keys by looking at scalar tokens that precede a value token
  if (token.type === "value" && prev && prev.type === "scalar" && prev.value) {
    const keyCol = prev.startCol;
    const keyValue = prev.value;

    // Find or create the correct indent level
    while (levels.length > 0 && levels[levels.length - 1].indent > keyCol) {
      levels.pop();
    }

    if (levels.length === 0 || levels[levels.length - 1].indent < keyCol) {
      levels.push({ keys: new Set(), indent: keyCol });
    }

    const current = levels[levels.length - 1];
    if (current.indent === keyCol) {
      if (current.keys.has(keyValue)) {
        yield {
          line: prev.startLine,
          column: prev.startCol,
          rule: id,
          level: "error",
          message: `duplication of key "${keyValue}" in mapping`,
        };
      } else {
        current.keys.add(keyValue);
      }
    }
  }
}
