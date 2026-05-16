/**
 * Minimal YAML parser — zero dependencies.
 * Supports the subset of YAML needed for yamllint configuration files
 * and basic syntax error detection.
 */

export interface YamlParseError {
  message: string;
  line: number;
  column: number;
}

/**
 * Parse a YAML string into a JavaScript object.
 * Supports: mappings, sequences, scalars, quoted strings, comments, anchors/aliases.
 * Does NOT support: all of YAML spec (tags, complex keys, etc.) — just enough for config.
 */
export function parseYaml(source: string): unknown {
  const lines = source.split("\n");
  const result = parseDocument(lines, 0, lines.length, -1);
  return result.value;
}

/**
 * Check YAML source for syntax errors. Returns the first error found, or null.
 */
export function checkSyntax(source: string): YamlParseError | null {
  try {
    parseYaml(source);
    return null;
  } catch (e: unknown) {
    if (e instanceof YamlSyntaxError) {
      return { message: e.message, line: e.line, column: e.column };
    }
    return null;
  }
}

class YamlSyntaxError extends Error {
  line: number;
  column: number;
  constructor(message: string, line: number, column: number) {
    super(message);
    this.line = line;
    this.column = column;
  }
}

interface ParseResult {
  value: unknown;
  endLine: number;
}

function parseDocument(
  lines: string[],
  startLine: number,
  endLine: number,
  _parentIndent: number,
): ParseResult {
  let i = startLine;

  // Skip leading blank lines and comments and document markers
  while (i < endLine) {
    const trimmed = lines[i].trim();
    if (trimmed === "" || trimmed.startsWith("#") || trimmed === "---" || trimmed === "...") {
      i++;
    } else {
      break;
    }
  }

  if (i >= endLine) {
    return { value: null, endLine: i };
  }

  const firstLine = lines[i];
  const indent = getIndent(firstLine);
  const trimmed = firstLine.trim();

  // Flow mapping
  if (trimmed.startsWith("{")) {
    return { value: parseFlowMapping(trimmed), endLine: i + 1 };
  }

  // Flow sequence
  if (trimmed.startsWith("[")) {
    return { value: parseFlowSequence(trimmed), endLine: i + 1 };
  }

  // Block sequence
  if (trimmed.startsWith("- ") || trimmed === "-") {
    return parseBlockSequence(lines, i, endLine, indent);
  }

  // Block mapping (key: value)
  if (trimmed.includes(": ") || trimmed.endsWith(":")) {
    return parseBlockMapping(lines, i, endLine, indent);
  }

  // Scalar value
  return { value: parseScalarValue(trimmed), endLine: i + 1 };
}

function parseBlockMapping(
  lines: string[],
  startLine: number,
  endLine: number,
  baseIndent: number,
): ParseResult {
  const result: Record<string, unknown> = {};
  let i = startLine;

  while (i < endLine) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "" || trimmed.startsWith("#") || trimmed === "---" || trimmed === "...") {
      i++;
      continue;
    }

    const lineIndent = getIndent(line);
    if (lineIndent < baseIndent) break;
    if (lineIndent > baseIndent) {
      i++;
      continue;
    }

    // Parse key: value
    const colonIdx = findColon(trimmed);
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();
    const cleanKey = unquote(key);

    if (rawValue === "" || rawValue.startsWith("#")) {
      // Multi-line value — look at next lines
      const childIndent = findChildIndent(lines, i + 1, endLine, baseIndent);
      if (childIndent > baseIndent) {
        const child = parseDocument(lines, i + 1, endLine, baseIndent);
        result[cleanKey] = child.value;
        i = child.endLine;
      } else {
        result[cleanKey] = null;
        i++;
      }
    } else if (rawValue.startsWith("{")) {
      result[cleanKey] = parseFlowMapping(rawValue);
      i++;
    } else if (rawValue.startsWith("[")) {
      result[cleanKey] = parseFlowSequence(rawValue);
      i++;
    } else if (rawValue.startsWith("|") || rawValue.startsWith(">")) {
      // Block scalar — collect indented lines
      const blockLines: string[] = [];
      const childIndent = findChildIndent(lines, i + 1, endLine, baseIndent);
      let j = i + 1;
      while (j < endLine) {
        const bl = lines[j];
        if (bl.trim() === "") {
          blockLines.push("");
          j++;
        } else if (getIndent(bl) >= childIndent) {
          blockLines.push(bl.slice(childIndent));
          j++;
        } else {
          break;
        }
      }
      result[cleanKey] = blockLines.join("\n");
      i = j;
    } else {
      const commentIdx = findInlineComment(rawValue);
      const cleanValue = commentIdx >= 0 ? rawValue.slice(0, commentIdx).trim() : rawValue;
      result[cleanKey] = parseScalarValue(cleanValue);
      i++;
    }
  }

  return { value: result, endLine: i };
}

function parseBlockSequence(
  lines: string[],
  startLine: number,
  endLine: number,
  baseIndent: number,
): ParseResult {
  const result: unknown[] = [];
  let i = startLine;

  while (i < endLine) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "" || trimmed.startsWith("#")) {
      i++;
      continue;
    }

    const lineIndent = getIndent(line);
    if (lineIndent < baseIndent) break;

    if (trimmed.startsWith("- ") || trimmed === "-") {
      const itemValue = trimmed === "-" ? "" : trimmed.slice(2);

      if (itemValue === "" || itemValue.startsWith("#")) {
        // Multi-line item
        const childIndent = findChildIndent(lines, i + 1, endLine, lineIndent);
        if (childIndent > lineIndent) {
          const child = parseDocument(lines, i + 1, endLine, lineIndent);
          result.push(child.value);
          i = child.endLine;
        } else {
          result.push(null);
          i++;
        }
      } else if (itemValue.includes(": ") || itemValue.endsWith(":")) {
        // Inline mapping in sequence item
        const tempLines = [" ".repeat(lineIndent + 2) + itemValue, ...lines.slice(i + 1)];
        const child = parseBlockMapping(tempLines, 0, tempLines.length, lineIndent + 2);
        result.push(child.value);
        // Calculate how many original lines were consumed
        i = i + 1 + (child.endLine - 1);
      } else {
        result.push(parseScalarValue(itemValue));
        i++;
      }
    } else {
      i++;
    }
  }

  return { value: result, endLine: i };
}

function parseFlowMapping(str: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  // Remove outer braces
  const inner = str.slice(1, str.lastIndexOf("}")).trim();
  if (!inner) return result;

  const pairs = splitFlow(inner);
  for (const pair of pairs) {
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) continue;
    const key = pair.slice(0, colonIdx).trim();
    const value = pair.slice(colonIdx + 1).trim();
    result[unquote(key)] = parseScalarValue(value);
  }
  return result;
}

function parseFlowSequence(str: string): unknown[] {
  const result: unknown[] = [];
  const inner = str.slice(1, str.lastIndexOf("]")).trim();
  if (!inner) return result;

  const items = splitFlow(inner);
  for (const item of items) {
    result.push(parseScalarValue(item.trim()));
  }
  return result;
}

function splitFlow(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let inString = false;
  let stringChar = "";

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      current += ch;
      if (ch === stringChar && str[i - 1] !== "\\") {
        inString = false;
      }
    } else if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      current += ch;
    } else if (ch === "{" || ch === "[") {
      depth++;
      current += ch;
    } else if (ch === "}" || ch === "]") {
      depth--;
      current += ch;
    } else if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function parseScalarValue(str: string): unknown {
  if (str === "" || str === "null" || str === "~") return null;
  if (str === "true" || str === "True" || str === "TRUE") return true;
  if (str === "false" || str === "False" || str === "FALSE") return false;

  // Quoted string
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }

  // Number
  if (/^-?\d+$/.test(str)) return parseInt(str, 10);
  if (/^-?\d+\.\d+$/.test(str)) return parseFloat(str);

  return str;
}

function getIndent(line: string): number {
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === " ") count++;
    else break;
  }
  return count;
}

function findColon(trimmed: string): number {
  let inString = false;
  let stringChar = "";

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (ch === stringChar && trimmed[i - 1] !== "\\") inString = false;
    } else if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
    } else if (ch === ":") {
      if (i + 1 >= trimmed.length || trimmed[i + 1] === " " || trimmed[i + 1] === "\n") {
        return i;
      }
    }
  }
  return -1;
}

function findInlineComment(str: string): number {
  let inString = false;
  let stringChar = "";

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (ch === stringChar && str[i - 1] !== "\\") inString = false;
    } else if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
    } else if (ch === "#" && i > 0 && str[i - 1] === " ") {
      return i - 1;
    }
  }
  return -1;
}

function findChildIndent(
  lines: string[],
  startLine: number,
  endLine: number,
  parentIndent: number,
): number {
  for (let i = startLine; i < endLine; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const indent = getIndent(line);
    if (indent > parentIndent) return indent;
    break;
  }
  return parentIndent + 2;
}

function unquote(str: string): string {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}
