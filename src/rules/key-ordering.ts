import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "key-ordering";
export const type = "token";

interface OrderTracker {
  lastKey: string | null;
  indent: number;
}

const orderStacks: OrderTracker[] = [];

export function reset(): void {
  orderStacks.length = 0;
}

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  _prev: YamlToken | undefined,
  next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  _context: TokenContext,
): Generator<LintProblem> {
  if (!token) return;

  if (token.type === "block-mapping-start" || token.type === "flow-mapping-start") {
    orderStacks.push({ lastKey: null, indent: token.startCol });
  } else if (token.type === "block-end" || token.type === "flow-mapping-end") {
    orderStacks.pop();
  } else if (token.type === "key" && next && next.type === "scalar") {
    const keyValue = next.value || "";
    if (orderStacks.length > 0) {
      const current = orderStacks[orderStacks.length - 1];
      if (current.lastKey !== null && keyValue < current.lastKey) {
        yield {
          line: next.startLine,
          column: next.startCol,
          rule: id,
          level: "error",
          message: `wrong ordering of key "${keyValue}" in mapping`,
        };
      }
      current.lastKey = keyValue;
    }
  }
}
