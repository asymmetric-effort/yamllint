import type { LintProblem, RuleConf, Comment } from "../types.js";

export const id = "comments-indentation";
export const type = "comment";

export function* check(conf: RuleConf, comment: Comment): Generator<LintProblem> {
  // Only check non-inline comments
  if (comment.inline) return;

  // Check that the comment's indentation matches the next token's indentation
  if (comment.tokenAfter) {
    const expectedCol = comment.tokenAfter.startCol;
    if (comment.column !== expectedCol) {
      yield {
        line: comment.line,
        column: comment.column,
        rule: id,
        level: "error",
        message: `comment not indented like content`,
      };
    }
  }
}
