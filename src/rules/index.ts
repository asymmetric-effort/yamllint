import * as anchors from "./anchors.js";
import * as braces from "./braces.js";
import * as brackets from "./brackets.js";
import * as colons from "./colons.js";
import * as commas from "./commas.js";
import * as comments from "./comments.js";
import * as commentsIndentation from "./comments-indentation.js";
import * as documentEnd from "./document-end.js";
import * as documentStart from "./document-start.js";
import * as emptyLines from "./empty-lines.js";
import * as emptyValues from "./empty-values.js";
import * as floatValues from "./float-values.js";
import * as hyphens from "./hyphens.js";
import * as indentation from "./indentation.js";
import * as keyDuplicates from "./key-duplicates.js";
import * as keyOrdering from "./key-ordering.js";
import * as lineLength from "./line-length.js";
import * as newLineAtEndOfFile from "./new-line-at-end-of-file.js";
import * as newLines from "./new-lines.js";
import * as octalValues from "./octal-values.js";
import * as quotedStrings from "./quoted-strings.js";
import * as trailingSpaces from "./trailing-spaces.js";
import * as truthy from "./truthy.js";

export interface RuleModule {
  id: string;
  type: string;
  check: (...args: unknown[]) => Generator<unknown>;
  reset?: (...args: unknown[]) => void;
}

const RULES: Record<string, RuleModule> = {
  anchors: anchors as unknown as RuleModule,
  braces: braces as unknown as RuleModule,
  brackets: brackets as unknown as RuleModule,
  colons: colons as unknown as RuleModule,
  commas: commas as unknown as RuleModule,
  comments: comments as unknown as RuleModule,
  "comments-indentation": commentsIndentation as unknown as RuleModule,
  "document-end": documentEnd as unknown as RuleModule,
  "document-start": documentStart as unknown as RuleModule,
  "empty-lines": emptyLines as unknown as RuleModule,
  "empty-values": emptyValues as unknown as RuleModule,
  "float-values": floatValues as unknown as RuleModule,
  hyphens: hyphens as unknown as RuleModule,
  indentation: indentation as unknown as RuleModule,
  "key-duplicates": keyDuplicates as unknown as RuleModule,
  "key-ordering": keyOrdering as unknown as RuleModule,
  "line-length": lineLength as unknown as RuleModule,
  "new-line-at-end-of-file": newLineAtEndOfFile as unknown as RuleModule,
  "new-lines": newLines as unknown as RuleModule,
  "octal-values": octalValues as unknown as RuleModule,
  "quoted-strings": quotedStrings as unknown as RuleModule,
  "trailing-spaces": trailingSpaces as unknown as RuleModule,
  truthy: truthy as unknown as RuleModule,
};

export function getRuleDefinition(id: string): RuleModule | undefined {
  return RULES[id];
}

export function getAllRuleIds(): string[] {
  return Object.keys(RULES);
}

export function getAllRules(): RuleModule[] {
  return Object.values(RULES);
}
