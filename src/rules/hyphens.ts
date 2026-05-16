import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "hyphens";
export const type = "token";

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  _prev: YamlToken | undefined,
  next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  _context: TokenContext,
): Generator<LintProblem> {
  if (!token || token.type !== "block-entry") return;

  const maxSpacesAfter = conf["max-spaces-after"] as number;

  if (next && token.startLine === next.startLine) {
    const spacesAfter = next.startCol - token.endCol;
    if (spacesAfter > maxSpacesAfter) {
      yield {
        line: token.startLine,
        column: next.startCol,
        rule: id,
        level: "error",
        message: `too many spaces after hyphen`,
      };
    }
  }
}
