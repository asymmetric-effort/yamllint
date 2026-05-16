import type { LintProblem, RuleConf, YamlToken, TokenContext } from "../types.js";

export const id = "brackets";
export const type = "token";

export function* check(
  conf: RuleConf,
  token: YamlToken | undefined,
  prev: YamlToken | undefined,
  next: YamlToken | undefined,
  _nextnext: YamlToken | undefined,
  context: TokenContext,
): Generator<LintProblem> {
  if (!token) return;

  if (conf.forbid === true) {
    if (token.type === "flow-sequence-start") {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: "flow sequence (brackets) is forbidden",
      };
    }
    return;
  }

  if (conf.forbid === "non-empty") {
    if (token.type === "flow-sequence-start" && next && next.type !== "flow-sequence-end") {
      yield {
        line: token.startLine,
        column: token.startCol,
        rule: id,
        level: "error",
        message: "flow sequence (brackets) is forbidden",
      };
    }
    return;
  }

  if (token.type === "flow-sequence-start") {
    context.stack.push(token);

    if (next && next.type === "flow-sequence-end") {
      const spaces = next.startCol - token.startCol - 1;
      const minEmpty =
        (conf["min-spaces-inside-empty"] as number) >= 0
          ? (conf["min-spaces-inside-empty"] as number)
          : (conf["min-spaces-inside"] as number);
      const maxEmpty =
        (conf["max-spaces-inside-empty"] as number) >= 0
          ? (conf["max-spaces-inside-empty"] as number)
          : (conf["max-spaces-inside"] as number);

      if (token.startLine === next.startLine) {
        if (spaces < minEmpty) {
          yield {
            line: token.startLine,
            column: next.startCol,
            rule: id,
            level: "error",
            message: `too few spaces inside brackets`,
          };
        } else if (spaces > maxEmpty) {
          yield {
            line: token.startLine,
            column: next.startCol,
            rule: id,
            level: "error",
            message: `too many spaces inside brackets`,
          };
        }
      }
    } else if (next && token.startLine === next.startLine) {
      const spaces = next.startCol - token.startCol - 1;
      const min = conf["min-spaces-inside"] as number;
      const max = conf["max-spaces-inside"] as number;

      if (spaces < min) {
        yield {
          line: token.startLine,
          column: next.startCol,
          rule: id,
          level: "error",
          message: `too few spaces inside brackets`,
        };
      } else if (spaces > max) {
        yield {
          line: token.startLine,
          column: next.startCol,
          rule: id,
          level: "error",
          message: `too many spaces inside brackets`,
        };
      }
    }
  } else if (token.type === "flow-sequence-end") {
    if (
      context.stack.length > 0 &&
      context.stack[context.stack.length - 1].type === "flow-sequence-start"
    ) {
      context.stack.pop();
      if (prev && prev.type !== "flow-sequence-start" && prev.startLine === token.startLine) {
        const spaces = token.startCol - prev.endCol;
        const min = conf["min-spaces-inside"] as number;
        const max = conf["max-spaces-inside"] as number;

        if (spaces < min) {
          yield {
            line: token.startLine,
            column: token.startCol,
            rule: id,
            level: "error",
            message: `too few spaces inside brackets`,
          };
        } else if (spaces > max) {
          yield {
            line: token.startLine,
            column: token.startCol,
            rule: id,
            level: "error",
            message: `too many spaces inside brackets`,
          };
        }
      }
    }
  }
}
