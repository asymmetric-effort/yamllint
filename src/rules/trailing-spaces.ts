import type { LintProblem, RuleConf, LineInfo } from "../types.js";

export const id = "trailing-spaces";
export const type = "line";

export function* check(_conf: RuleConf, line: LineInfo): Generator<LintProblem> {
  const content = line.content;
  if (content.length > 0 && content !== content.trimEnd()) {
    const trimmedLength = content.trimEnd().length;
    yield {
      line: line.line,
      column: trimmedLength + 1,
      rule: id,
      level: "error",
      message: `trailing spaces`,
    };
  }
}
