import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "float-values";
export const type = "token";

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  _prev: YamlToken | undefined,
  _next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  _context: TokenContext,
): Generator<LintProblem> {
  if (!token || token.type !== "scalar" || token.style !== "plain") return;
  if (!token.value) return;

  const val = token.value.trim();
  const forbidScientific = conf["forbid-scientific-notation"] as boolean;
  const forbidNan = conf["forbid-nan"] as boolean;
  const forbidInf = conf["forbid-inf"] as boolean;

  if (forbidScientific) {
    if (/^[-+]?(\d+\.?\d*|\.\d+)[eE][-+]?\d+$/.test(val)) {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `scientific notation forbidden`,
      };
    }
  }

  if (forbidNan) {
    if (/^\.nan$/i.test(val)) {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `NaN value forbidden`,
      };
    }
  }

  if (forbidInf) {
    if (/^[-+]?\.inf$/i.test(val)) {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `infinite value forbidden`,
      };
    }
  }
}
