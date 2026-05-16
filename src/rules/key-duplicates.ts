import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "key-duplicates";
export const type = "token";

interface KeyTracker {
  keys: Set<string>;
  indent: number;
}

const keyStacks: KeyTracker[] = [];

export function reset(): void {
  keyStacks.length = 0;
}

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  prev: YamlToken | undefined,
  next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  _context: TokenContext,
): Generator<LintProblem> {
  if (!token) return;

  if (token.type === "block-mapping-start" || token.type === "flow-mapping-start") {
    keyStacks.push({ keys: new Set(), indent: token.startCol });
  } else if (token.type === "block-end" || token.type === "flow-mapping-end") {
    keyStacks.pop();
  } else if (token.type === "key" && next && next.type === "scalar") {
    const keyValue = next.value || "";
    if (keyStacks.length > 0) {
      const current = keyStacks[keyStacks.length - 1];
      if (current.keys.has(keyValue)) {
        yield {
          line: next.startLine,
          column: next.startCol,
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
