import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "document-start";
export const type = "token";

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  prev: YamlToken | undefined,
  _next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  context: TokenContext,
): Generator<LintProblem> {
  if (!token) return;

  const present = conf.present as boolean;

  if (token.type === "document-start") {
    if (!present) {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `found forbidden document start "---"`,
      };
    }
  } else if (token.type === "scalar" || token.type === "block-entry" || token.type === "key") {
    // If we expect document-start but haven't seen one,
    // check if prev is stream-start (meaning no document-start marker)
    if (present && prev && prev.type === "stream-start") {
      yield {
        line: token.startLine,
        column: 1,
        rule: id,
        level: "error",
        message: `missing document start "---"`,
      };
    }
  }
}
