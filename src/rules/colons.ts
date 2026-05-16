import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "colons";
export const type = "token";

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  prev: YamlToken | undefined,
  next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  _context: TokenContext,
): Generator<LintProblem> {
  if (!token || token.type !== "value") return;

  const maxBefore = conf["max-spaces-before"] as number;
  const maxAfter = conf["max-spaces-after"] as number;

  if (prev && prev.startLine === token.startLine && maxBefore >= 0) {
    const spacesBefore = token.startCol - prev.endCol;
    if (spacesBefore > maxBefore) {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `too many spaces before colon`,
      };
    }
  }

  if (next && token.startLine === next.startLine && maxAfter >= 0) {
    const spacesAfter = next.startCol - token.endCol;
    if (spacesAfter > maxAfter) {
      yield {
        line: token.startLine,
        column: next.startCol,
        rule: id,
        level: "error",
        message: `too many spaces after colon`,
      };
    }
  }
}
