import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "key-ordering";
export const type = "token";

interface OrderTracker {
  lastKey: string | null;
  indent: number;
}

let orderStacks: OrderTracker[] = [];

export function reset(): void {
  orderStacks = [];
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
    orderStacks = [];
    return;
  }

  if (token.type === "flow-mapping-start") {
    orderStacks.push({ lastKey: null, indent: token.startCol });
    return;
  }

  if (token.type === "flow-mapping-end") {
    if (orderStacks.length > 0) {
      orderStacks.pop();
    }
    return;
  }

  // Detect keys: scalar followed by value token (same as key-duplicates)
  if (token.type === "value" && prev && prev.type === "scalar" && prev.value !== undefined) {
    const keyCol = prev.startCol;
    const keyValue = prev.value;

    // Manage indent levels
    while (orderStacks.length > 0 && orderStacks[orderStacks.length - 1].indent > keyCol) {
      orderStacks.pop();
    }

    if (orderStacks.length === 0 || orderStacks[orderStacks.length - 1].indent < keyCol) {
      orderStacks.push({ lastKey: null, indent: keyCol });
    }

    const current = orderStacks[orderStacks.length - 1];
    if (current.indent === keyCol) {
      if (current.lastKey !== null && keyValue < current.lastKey) {
        yield {
          line: prev.startLine,
          column: prev.startCol,
          rule: id,
          level: "error",
          message: `wrong ordering of key "${keyValue}" in mapping`,
        };
      }
      current.lastKey = keyValue;
    }
  }
}
