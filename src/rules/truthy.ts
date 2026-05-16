import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "truthy";
export const type = "token";

const TRUTHY_VALUES = [
  "TRUE",
  "True",
  "true",
  "FALSE",
  "False",
  "false",
  "YES",
  "Yes",
  "yes",
  "NO",
  "No",
  "no",
  "ON",
  "On",
  "on",
  "OFF",
  "Off",
  "off",
  "y",
  "Y",
  "n",
  "N",
];

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  _prev: YamlToken | undefined,
  next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  _context: TokenContext,
): Generator<LintProblem> {
  if (!token || token.type !== "scalar" || token.style !== "plain") return;
  if (!token.value) return;

  const val = token.value.trim();
  const allowedValues = (conf["allowed-values"] as string[]) || ["true", "false"];
  const checkKeys = conf["check-keys"] as boolean;

  // Skip if this is a key (followed by value token) and check-keys is false
  const isKey = next && next.type === "value";
  if (!checkKeys && isKey) return;

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
