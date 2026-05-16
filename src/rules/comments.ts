import type { LintProblem, RuleConf, Comment } from "../types.js";

export const id = "comments";
export const type = "comment";

export function* check(conf: RuleConf, comment: Comment): Generator<LintProblem> {
  const requireStartingSpace = conf["require-starting-space"] as boolean;
  const ignoreShebangs = conf["ignore-shebangs"] as boolean;
  const minSpacesFromContent = conf["min-spaces-from-content"] as number;

  const text = comment.text;

  // Check shebang
  if (ignoreShebangs && comment.line === 1 && text.startsWith("#!")) {
    return;
  }

  // Check starting space after #
  if (requireStartingSpace && text.length > 1 && text[1] !== " " && text[1] !== "!") {
    // Allow #--- and #... for document markers in comments
    if (!text.startsWith("#---") && !text.startsWith("#...")) {
      yield {
        line: comment.line,
        column: comment.column,
        rule: id,
        level: "error",
        message: `comment not indented like content`,
      };
    }
  }

  // Check min spaces from content
  if (comment.inline && minSpacesFromContent > 0) {
    if (comment.tokenBefore) {
      const spacesFrom = comment.column - comment.tokenBefore.endCol;
      if (spacesFrom < minSpacesFromContent) {
        yield {
          line: comment.line,
          column: comment.column,
          rule: id,
          level: "error",
          message: `too few spaces before comment`,
        };
      }
    }
  }
}
