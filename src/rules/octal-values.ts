import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "octal-values";
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
  const forbidImplicit = conf["forbid-implicit-octal"] as boolean;
  const forbidExplicit = conf["forbid-explicit-octal"] as boolean;

  if (forbidImplicit) {
    // YAML 1.1 implicit octal: 0777
    if (/^0[0-7]+$/.test(val) && val !== "0") {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `implicit octal value "${val}"`,
      };
    }
  }

  if (forbidExplicit) {
    // YAML 1.2 explicit octal: 0o777
    if (/^0o[0-7]+$/i.test(val)) {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `explicit octal value "${val}"`,
      };
    }
  }
}
