import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "empty-values";
export const type = "token";

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  _prev: YamlToken | undefined,
  next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  _context: TokenContext,
): Generator<LintProblem> {
  if (!token) return;

  const forbidInBlockMappings = conf["forbid-in-block-mappings"] as boolean;
  const forbidInFlowMappings = conf["forbid-in-flow-mappings"] as boolean;

  if (forbidInBlockMappings) {
    if (
      token.type === "value" &&
      next &&
      (next.type === "key" ||
        next.type === "block-end" ||
        next.type === "stream-end" ||
        next.type === "document-start" ||
        next.type === "document-end")
    ) {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `empty value in block mapping`,
      };
    }
  }

  if (forbidInFlowMappings) {
    if (
      token.type === "value" &&
      next &&
      (next.type === "flow-mapping-end" || (next.type === "scalar" && next.value === ""))
    ) {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `empty value in flow mapping`,
      };
    }
  }
}
