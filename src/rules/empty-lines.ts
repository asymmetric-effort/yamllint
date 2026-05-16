import type { LintProblem, RuleConf, LineInfo } from "../types.js";

export const id = "empty-lines";
export const type = "line";

let consecutiveEmpty = 0;
let lineCount = 0;
let totalLines = 0;

export function reset(total: number): void {
  consecutiveEmpty = 0;
  lineCount = 0;
  totalLines = total;
}

export function* check(conf: RuleConf, line: LineInfo): Generator<LintProblem> {
  const max = conf.max as number;
  const maxStart = conf["max-start"] as number;
  const maxEnd = conf["max-end"] as number;

  lineCount++;

  if (line.content.trim() === "") {
    consecutiveEmpty++;
  } else {
    consecutiveEmpty = 0;
    return;
  }

  // Check max consecutive empty lines
  if (consecutiveEmpty > max && line.content.trim() === "") {
    // Check if we're at start of file
    if (lineCount <= consecutiveEmpty) {
      if (maxStart >= 0 && consecutiveEmpty > maxStart) {
        yield {
          line: line.line,
          column: 1,
          rule: id,
          level: "error",
          message: `too many blank lines (${consecutiveEmpty} > ${maxStart})`,
        };
      }
    } else {
      yield {
        line: line.line,
        column: 1,
        rule: id,
        level: "error",
        message: `too many blank lines (${consecutiveEmpty} > ${max})`,
      };
    }
  }
}
