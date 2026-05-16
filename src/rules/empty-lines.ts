import type { LintProblem, RuleConf, LineInfo } from "../types.js";

export const id = "empty-lines";
export const type = "line";

let consecutiveEmpty = 0;
let foundContent = false;

export function reset(_total: number): void {
  consecutiveEmpty = 0;
  foundContent = false;
}

export function* check(conf: RuleConf, line: LineInfo): Generator<LintProblem> {
  const max = conf.max as number;
  const maxStart = conf["max-start"] as number;

  if (line.content.trim() === "") {
    consecutiveEmpty++;
  } else {
    if (!foundContent) foundContent = true;
    consecutiveEmpty = 0;
    return;
  }

  // At start of file (haven't seen content yet)
  if (!foundContent && maxStart >= 0 && consecutiveEmpty > maxStart) {
    yield {
      line: line.line,
      column: 1,
      rule: id,
      level: "error",
      message: `too many blank lines (${consecutiveEmpty} > ${maxStart})`,
    };
    return;
  }

  // In body of file
  if (foundContent && consecutiveEmpty > max) {
    yield {
      line: line.line,
      column: 1,
      rule: id,
      level: "error",
      message: `too many blank lines (${consecutiveEmpty} > ${max})`,
    };
  }
}
