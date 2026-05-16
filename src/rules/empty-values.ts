import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "empty-values";
export const type = "token";

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  _prev: YamlToken | undefined,
  next: YamlToken | undefined,
  nextnext: YamlToken | undefined,
  _context: TokenContext,
): Generator<LintProblem> {
  if (!token) return;

  const forbidInBlockMappings = conf["forbid-in-block-mappings"] as boolean;
  const forbidInFlowMappings = conf["forbid-in-flow-mappings"] as boolean;

  if (forbidInBlockMappings && token.type === "value") {
    // Empty value: value token followed by another key at same/lower indent,
    // or stream-end, or document markers
    if (!next) return;
    if (
      next.type === "stream-end" ||
      next.type === "document-start" ||
      next.type === "document-end"
    ) {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `empty value in block mapping`,
      };
    } else if (next.type === "scalar" && nextnext && nextnext.type === "value") {
      // Next key-value pair at same or lower indent means current value is empty
      if (next.startLine > token.startLine && next.startCol <= token.startCol) {
        yield {
          line: token.startLine,
          column: token.startCol,
          rule: id,
          level: "error",
          message: `empty value in block mapping`,
        };
      }
    }
  }

  if (forbidInFlowMappings && token.type === "value") {
    if (next && next.type === "flow-mapping-end") {
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
