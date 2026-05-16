import type { LintProblem, RuleConf, LineInfo } from "../types.js";

export const id = "commas";
export const type = "line";

export function* check(conf: RuleConf, line: LineInfo): Generator<LintProblem> {
  const content = line.content;
  const maxBefore = conf["max-spaces-before"] as number;
  const minAfter = conf["min-spaces-after"] as number;
  const maxAfter = conf["max-spaces-after"] as number;

  let inString = false;
  let stringChar = "";
  let escaped = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (!inString && (ch === '"' || ch === "'")) {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (inString && ch === stringChar) {
      inString = false;
      continue;
    }
    if (inString) continue;

    if (ch === "#") break;

    if (ch === ",") {
      // Check spaces before comma
      if (maxBefore >= 0) {
        let spacesBefore = 0;
        for (let j = i - 1; j >= 0 && content[j] === " "; j--) {
          spacesBefore++;
        }
        if (spacesBefore > maxBefore) {
          yield {
            line: line.line,
            column: i + 1,
            rule: id,
            level: "error",
            message: `too many spaces before comma`,
          };
        }
      }

      // Check spaces after comma
      if (i + 1 < content.length) {
        let spacesAfter = 0;
        for (let j = i + 1; j < content.length && content[j] === " "; j++) {
          spacesAfter++;
        }
        const nextNonSpace = content[i + 1 + spacesAfter];
        if (nextNonSpace !== undefined && nextNonSpace !== "\n" && nextNonSpace !== "#") {
          if (spacesAfter < minAfter) {
            yield {
              line: line.line,
              column: i + 2,
              rule: id,
              level: "error",
              message: `too few spaces after comma`,
            };
          } else if (spacesAfter > maxAfter) {
            yield {
              line: line.line,
              column: i + 2,
              rule: id,
              level: "error",
              message: `too many spaces after comma`,
            };
          }
        }
      }
    }
  }
}
