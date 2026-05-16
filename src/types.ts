export type Severity = "error" | "warning";

export interface LintProblem {
  line: number;
  column: number;
  rule: string | null;
  level: Severity;
  message: string;
}

export type RuleType = "token" | "comment" | "line";

export interface RuleOption {
  type: "int" | "bool" | "str" | "choice" | "list";
  default: unknown;
  choices?: string[];
}

export interface RuleDefinition {
  id: string;
  type: RuleType;
  options: Record<string, RuleOption>;
  check: RuleChecker;
}

export type TokenRuleChecker = (
  conf: RuleConf,
  token: YamlToken | undefined,
  prev: YamlToken | undefined,
  next: YamlToken | undefined,
  nextnext: YamlToken | undefined,
  context: TokenContext,
) => Generator<LintProblem>;

export type CommentRuleChecker = (conf: RuleConf, comment: Comment) => Generator<LintProblem>;

export type LineRuleChecker = (conf: RuleConf, line: LineInfo) => Generator<LintProblem>;

export type RuleChecker = TokenRuleChecker | CommentRuleChecker | LineRuleChecker;

export interface RuleConf {
  [key: string]: unknown;
}

export interface TokenContext {
  stack: YamlToken[];
}

export interface Comment {
  line: number;
  column: number;
  text: string;
  tokenBefore: YamlToken | undefined;
  tokenAfter: YamlToken | undefined;
  inline: boolean;
}

export interface LineInfo {
  line: number;
  content: string;
  end: string;
}

export type YamlTokenType =
  | "stream-start"
  | "stream-end"
  | "document-start"
  | "document-end"
  | "block-sequence-start"
  | "block-mapping-start"
  | "block-end"
  | "flow-sequence-start"
  | "flow-sequence-end"
  | "flow-mapping-start"
  | "flow-mapping-end"
  | "block-entry"
  | "key"
  | "value"
  | "alias"
  | "anchor"
  | "tag"
  | "scalar";

export interface YamlToken {
  type: YamlTokenType;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  value?: string;
  style?: string;
}

export type OutputFormat = "parsable" | "standard" | "colored" | "github" | "auto";

export interface YamllintConfig {
  extends?: "default" | "relaxed";
  rules: Record<string, RuleConf | "enable" | "disable" | false>;
  yamlFiles?: string[];
  ignore?: string;
  ignoreFromFile?: string[];
  locale?: string;
}

export interface ResolvedRuleConfig {
  id: string;
  conf: RuleConf;
  level: Severity;
}
