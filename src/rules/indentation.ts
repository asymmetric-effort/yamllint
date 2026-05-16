import type { LintProblem, RuleConf, LineInfo } from "../types.js";

export const id = "indentation";
export const type = "line";

export function* check(conf: RuleConf, line: LineInfo): Generator<LintProblem> {
  const spaces = conf.spaces as number;
  const content = line.content;

  if (content.trim() === "") return;

  // Count leading spaces
  let indent = 0;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === " ") {
      indent++;
    } else if (content[i] === "\t") {
      yield {
        line: line.line,
        column: i + 1,
        rule: id,
        level: "error",
        message: `wrong indentation: found tab character`,
      };
      return;
    } else {
      break;
    }
  }

  // The indentation should be a multiple of the configured spaces
  // unless it's inside a multi-line string
  if (spaces > 0 && indent % spaces !== 0) {
    // Check if this could be a continuation (list items, etc.)
    const trimmed = content.trimStart();
    if (!trimmed.startsWith("-") && !trimmed.startsWith("#")) {
      yield {
        line: line.line,
        column: 1,
        rule: id,
        level: "error",
        message: `wrong indentation: expected ${spaces * Math.round(indent / spaces)} but found ${indent}`,
      };
    }
  }
}
