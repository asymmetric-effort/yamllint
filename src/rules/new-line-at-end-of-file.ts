import type { LintProblem, RuleConf, LineInfo } from "../types.js";

export const id = "new-line-at-end-of-file";
export const type = "line";

let lastLine: LineInfo | null = null;
let totalLineCount = 0;
let currentCount = 0;

export function reset(total: number): void {
  lastLine = null;
  totalLineCount = total;
  currentCount = 0;
}

export function* check(conf: RuleConf, line: LineInfo): Generator<LintProblem> {
  currentCount++;
  lastLine = line;

  // Only check on the last line
  if (currentCount === totalLineCount) {
    // If the last line has content but no line ending, the file doesn't end with a newline.
    // If the last line is empty with no ending, the file already ends with a newline
    // (from the previous line's ending).
    if (line.content.length > 0 && line.end === "") {
      yield {
        line: line.line,
        column: line.content.length + 1,
        rule: id,
        level: "error",
        message: `no new line character at the end of file`,
      };
    }
  }
}
