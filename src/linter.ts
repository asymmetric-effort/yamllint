import type { LintProblem, ResolvedRuleConfig, TokenContext } from "./types.js";
import { tokenize, extractComments, getLines } from "./parser.js";
import { getRuleDefinition } from "./rules/index.js";
import { parseDirectives, filterProblems } from "./directives.js";
import { checkSyntax } from "./yaml-parser.js";

export interface LintResult {
  problems: LintProblem[];
  source: string;
}

export function lint(source: string, rules: ResolvedRuleConfig[]): LintResult {
  const { disabledLines, disabledFile } = parseDirectives(source);

  if (disabledFile) {
    return { problems: [], source };
  }

  const problems: LintProblem[] = [];

  // Check for YAML syntax errors first
  const syntaxError = checkSyntax(source);
  if (syntaxError) {
    problems.push({
      line: syntaxError.line,
      column: syntaxError.column,
      rule: null,
      level: "error",
      message: `syntax error: ${syntaxError.message}`,
    });
  }

  // Tokenize
  const tokens = tokenize(source);
  const comments = extractComments(source);
  const lines = getLines(source);

  // Reset stateful rules
  for (const ruleConfig of rules) {
    const ruleDef = getRuleDefinition(ruleConfig.id);
    if (ruleDef && ruleDef.reset) {
      if (ruleConfig.id === "new-line-at-end-of-file" || ruleConfig.id === "empty-lines") {
        ruleDef.reset(lines.length);
      } else {
        ruleDef.reset();
      }
    }
  }

  // Run token rules
  const tokenRules = rules.filter((r) => {
    const def = getRuleDefinition(r.id);
    return def && def.type === "token";
  });

  const context: TokenContext = { stack: [] };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const prev = i > 0 ? tokens[i - 1] : undefined;
    const next = i < tokens.length - 1 ? tokens[i + 1] : undefined;
    const nextnext = i < tokens.length - 2 ? tokens[i + 2] : undefined;

    for (const ruleConfig of tokenRules) {
      const ruleDef = getRuleDefinition(ruleConfig.id);
      if (!ruleDef) continue;

      for (const problem of ruleDef.check(
        ruleConfig.conf,
        token,
        prev,
        next,
        nextnext,
        context,
      ) as Generator<LintProblem>) {
        problems.push({ ...problem, level: ruleConfig.level, rule: ruleConfig.id });
      }
    }
  }

  // Run comment rules
  const commentRules = rules.filter((r) => {
    const def = getRuleDefinition(r.id);
    return def && def.type === "comment";
  });

  // Enrich comments with token context
  for (const comment of comments) {
    // Find surrounding tokens for context
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].startLine === comment.line && tokens[i].startCol > comment.column) {
        comment.tokenAfter = tokens[i];
        if (i > 0) comment.tokenBefore = tokens[i - 1];
        break;
      }
      if (tokens[i].startLine > comment.line) {
        comment.tokenAfter = tokens[i];
        if (i > 0) comment.tokenBefore = tokens[i - 1];
        break;
      }
    }

    for (const ruleConfig of commentRules) {
      const ruleDef = getRuleDefinition(ruleConfig.id);
      if (!ruleDef) continue;

      for (const problem of ruleDef.check(ruleConfig.conf, comment) as Generator<LintProblem>) {
        problems.push({ ...problem, level: ruleConfig.level, rule: ruleConfig.id });
      }
    }
  }

  // Run line rules
  const lineRules = rules.filter((r) => {
    const def = getRuleDefinition(r.id);
    return def && def.type === "line";
  });

  for (const line of lines) {
    for (const ruleConfig of lineRules) {
      const ruleDef = getRuleDefinition(ruleConfig.id);
      if (!ruleDef) continue;

      for (const problem of ruleDef.check(ruleConfig.conf, line) as Generator<LintProblem>) {
        problems.push({ ...problem, level: ruleConfig.level, rule: ruleConfig.id });
      }
    }
  }

  // Filter out problems on disabled lines
  const filtered = filterProblems(problems, disabledLines, false);

  // Sort by line, then column
  filtered.sort((a, b) => a.line - b.line || a.column - b.column);

  return { problems: filtered, source };
}
