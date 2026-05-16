import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "quoted-strings";
export const type = "token";

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  _prev: YamlToken | undefined,
  next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  _context: TokenContext,
): Generator<LintProblem> {
  if (!token || token.type !== "scalar") return;

  const quoteType = conf["quote-type"] as string;
  const required = conf.required as boolean | string;
  const allowQuotedQuotes = conf["allow-quoted-quotes"] as boolean;

  const style = token.style;
  const value = token.value || "";

  // Skip block scalars
  if (style === "block") return;

  // Skip key scalars (scalar followed by value token)
  if (next && next.type === "value") return;

  // Determine if quoting is required
  if (required === true || required === "only-when-needed") {
    if (style === "plain") {
      if (required === true) {
        yield {
          line: token.startLine,
          column: token.startCol,
          rule: id,
          level: "error",
          message: `string value is not quoted`,
        };
      }
      // For only-when-needed, plain is fine
      return;
    }
  }

  if (required === "only-when-needed" && style !== "plain") {
    // Check if quoting is actually needed
    const needsQuoting = valueNeedsQuoting(value);
    if (!needsQuoting) {
      if (allowQuotedQuotes && valueContainsQuotes(value, style || "")) {
        return;
      }
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: `string value is redundantly quoted`,
      };
      return;
    }
  }

  // Check quote type
  if (quoteType === "single" && style === "double-quoted") {
    if (allowQuotedQuotes && value.includes("'")) return;
    yield {
      line: token.startLine,
      column: token.startCol,
      rule: id,
      level: "error",
      message: `string value is not single-quoted`,
    };
  } else if (quoteType === "double" && style === "single-quoted") {
    if (allowQuotedQuotes && value.includes('"')) return;
    yield {
      line: token.startLine,
      column: token.startCol,
      rule: id,
      level: "error",
      message: `string value is not double-quoted`,
    };
  }
}

function valueNeedsQuoting(value: string): boolean {
  // Values that would be interpreted differently without quotes
  const specialValues = [
    "true",
    "false",
    "yes",
    "no",
    "on",
    "off",
    "null",
    "~",
    "",
    "True",
    "False",
    "Yes",
    "No",
    "On",
    "Off",
    "TRUE",
    "FALSE",
    "YES",
    "NO",
    "ON",
    "OFF",
    "NULL",
  ];
  if (specialValues.includes(value)) return true;

  // Numbers
  if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(value)) return true;
  if (/^0x[0-9a-fA-F]+$/.test(value)) return true;
  if (/^0o[0-7]+$/.test(value)) return true;
  if (/^0b[01]+$/.test(value)) return true;

  // Special YAML values
  if (/^[-+]?\.inf$/i.test(value) || /^\.nan$/i.test(value)) return true;

  // Contains special chars that could be interpreted
  if (/^[{[\]},!&*#?|>@`'"%]/.test(value)) return true;
  if (value.includes(": ") || value.includes(" #")) return true;
  if (value.endsWith(":") || value.endsWith(" ")) return true;
  if (value.startsWith("- ") || value.startsWith("? ")) return true;

  return false;
}

function valueContainsQuotes(value: string, style: string): boolean {
  if (style === "single-quoted") return value.includes('"');
  if (style === "double-quoted") return value.includes("'");
  return false;
}
