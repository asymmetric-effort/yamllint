import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "document-end";
export const type = "token";

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  _prev: YamlToken | undefined,
  _next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  _context: TokenContext,
): Generator<LintProblem> {
  if (!token) return;

  const present = conf.present as boolean;

  if (token.type === "document-end") {
    if (!present) {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `found forbidden document end "..."`,
      };
    }
  }
}
