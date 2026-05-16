import type { LintProblem, RuleConf, LineInfo } from "../types.js";

export const id = "line-length";
export const type = "line";

export function* check(conf: RuleConf, line: LineInfo): Generator<LintProblem> {
  const max = conf.max as number;
  const allowNonBreakableWords = conf["allow-non-breakable-words"] as boolean;
  const allowNonBreakableInlineMappings = conf["allow-non-breakable-inline-mappings"] as boolean;
  const allowUri = conf["allow-uri"] as boolean;

  const content = line.content;
  if (content.length <= max) return;

  // Check if line contains a URI that makes it non-breakable
  if (allowUri) {
    const uriPattern = /https?:\/\/\S+/;
    if (uriPattern.test(content)) {
      // If removing the URI would make the line short enough, allow it
      const withoutUri = content.replace(/https?:\/\/\S+/g, "");
      if (withoutUri.length <= max) return;
      // If the URI itself is longer than max, allow it
      const match = content.match(uriPattern);
      if (match && match[0].length > max) return;
    }
  }

  // Check for non-breakable words
  if (allowNonBreakableWords) {
    const trimmed = content.trimStart();
    // If a single word goes past the limit and can't be broken
    if (!trimmed.includes(" ") || trimmed.indexOf(" ") > max) {
      return;
    }
  }

  // Check for inline mappings
  if (allowNonBreakableInlineMappings) {
    const trimmed = content.trimStart();
    if (trimmed.includes(": ") && trimmed.includes("{")) {
      return;
    }
  }

  yield {
    line: line.line,
    column: max + 1,
    rule: id,
    level: "error",
    message: `line too long (${content.length} > ${max})`,
  };
}
