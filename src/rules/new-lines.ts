import type { LintProblem, RuleConf, LineInfo } from "../types.js";

export const id = "new-lines";
export const type = "line";

export function* check(conf: RuleConf, line: LineInfo): Generator<LintProblem> {
  const expectedType = conf.type as string;

  if (line.end === "") return; // Last line without newline

  if (expectedType === "unix" && line.end !== "\n") {
    yield {
      line: line.line,
      column: line.content.length + 1,
      rule: id,
      level: "error",
      message: `wrong new line character: expected \\n`,
    };
  } else if (expectedType === "dos" && line.end !== "\r\n") {
    yield {
      line: line.line,
      column: line.content.length + 1,
      rule: id,
      level: "error",
      message: `wrong new line character: expected \\r\\n`,
    };
  } else if (expectedType === "platform") {
    const expected = process.platform === "win32" ? "\r\n" : "\n";
    if (line.end !== expected) {
      yield {
        line: line.line,
        column: line.content.length + 1,
        rule: id,
        level: "error",
        message: `wrong new line character: expected platform line ending`,
      };
    }
  }
}
