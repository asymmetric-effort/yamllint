import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "truthy";
export const type = "token";

const TRUTHY_VALUES = [
  "TRUE", "True", "true",
  "FALSE", "False", "false",
  "YES", "Yes", "yes",
  "NO", "No", "no",
  "ON", "On", "on",
  "OFF", "Off", "off",
  "y", "Y", "n", "N",
];

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  prev: YamlToken | undefined,
  _next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  _context: TokenContext,
): Generator<LintProblem> {
  if (!token || token.type !== "scalar" || token.style !== "plain") return;
  if (!token.value) return;

  const val = token.value.trim();
  const allowedValues = (conf["allowed-values"] as string[]) || ["true", "false"];
  const checkKeys = conf["check-keys"] as boolean;

  // Skip if this is a key and check-keys is false
  if (!checkKeys && prev && prev.type === "key") return;

  if (TRUTHY_VALUES.includes(val) && !allowedValues.includes(val)) {
    yield {
      line: token.startLine,
      column: token.startCol,
      rule: id,
      level: "error",
      message: `truthy value should be one of [${allowedValues.join(", ")}]`,
    };
  }
}
