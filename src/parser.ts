import type { Comment, LineInfo, YamlToken } from "./types.js";

export function tokenize(source: string): YamlToken[] {
  const tokens: YamlToken[] = [];
  const lines = source.split("\n");

  const streamStart: YamlToken = {
    type: "stream-start",
    startLine: 1,
    startCol: 1,
    endLine: 1,
    endCol: 1,
  };
  tokens.push(streamStart);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineNum = lineIdx + 1;

    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    let col = 0;
    // Skip leading whitespace
    while (col < line.length && line[col] === " ") col++;

    const remaining = line.slice(col);

    // Document start
    if (remaining === "---" || remaining.startsWith("--- ") || remaining === "---\r") {
      tokens.push({
        type: "document-start",
        startLine: lineNum,
        startCol: col + 1,
        endLine: lineNum,
        endCol: col + 4,
      });
      continue;
    }

    // Document end
    if (remaining === "..." || remaining.startsWith("... ") || remaining === "...\r") {
      tokens.push({
        type: "document-end",
        startLine: lineNum,
        startCol: col + 1,
        endLine: lineNum,
        endCol: col + 4,
      });
      continue;
    }

    // Tokenize the line content
    tokenizeLine(line, lineNum, tokens);
  }

  const lastLine = lines.length;
  const lastCol = (lines[lines.length - 1]?.length || 0) + 1;
  tokens.push({
    type: "stream-end",
    startLine: lastLine,
    startCol: lastCol,
    endLine: lastLine,
    endCol: lastCol,
  });

  return tokens;
}

function tokenizeLine(line: string, lineNum: number, tokens: YamlToken[]): void {
  let col = 0;

  // Skip leading whitespace
  while (col < line.length && line[col] === " ") col++;

  if (col >= line.length) return;

  // Block entry (list item)
  if (line[col] === "-" && (col + 1 >= line.length || line[col + 1] === " ")) {
    tokens.push({
      type: "block-entry",
      startLine: lineNum,
      startCol: col + 1,
      endLine: lineNum,
      endCol: col + 2,
    });
    col += 2;
    while (col < line.length && line[col] === " ") col++;
    if (col >= line.length || line[col] === "#") return;
  }

  // Explicit key
  if (line[col] === "?" && (col + 1 >= line.length || line[col + 1] === " ")) {
    tokens.push({
      type: "key",
      startLine: lineNum,
      startCol: col + 1,
      endLine: lineNum,
      endCol: col + 2,
    });
    col += 2;
    while (col < line.length && line[col] === " ") col++;
  }

  // Flow indicators
  if (line[col] === "{") {
    tokens.push({
      type: "flow-mapping-start",
      startLine: lineNum,
      startCol: col + 1,
      endLine: lineNum,
      endCol: col + 2,
    });
    tokenizeFlowContent(line, lineNum, col + 1, tokens);
    return;
  }

  if (line[col] === "[") {
    tokens.push({
      type: "flow-sequence-start",
      startLine: lineNum,
      startCol: col + 1,
      endLine: lineNum,
      endCol: col + 2,
    });
    tokenizeFlowContent(line, lineNum, col + 1, tokens);
    return;
  }

  // Check for anchor
  if (line[col] === "&") {
    const end = findWordEnd(line, col + 1);
    tokens.push({
      type: "anchor",
      startLine: lineNum,
      startCol: col + 1,
      endLine: lineNum,
      endCol: end + 1,
      value: line.slice(col + 1, end),
    });
    col = end;
    while (col < line.length && line[col] === " ") col++;
  }

  // Check for alias
  if (line[col] === "*") {
    const end = findWordEnd(line, col + 1);
    tokens.push({
      type: "alias",
      startLine: lineNum,
      startCol: col + 1,
      endLine: lineNum,
      endCol: end + 1,
      value: line.slice(col + 1, end),
    });
    return;
  }

  // Check for tag
  if (line[col] === "!") {
    const end = findWordEnd(line, col + 1);
    tokens.push({
      type: "tag",
      startLine: lineNum,
      startCol: col + 1,
      endLine: lineNum,
      endCol: end + 1,
      value: line.slice(col, end),
    });
    col = end;
    while (col < line.length && line[col] === " ") col++;
  }

  // Parse key: value or just a scalar
  const colonPos = findMappingColon(line, col);
  if (colonPos >= 0) {
    // Key
    const keyStart = col;
    const keyEnd = colonPos;
    const keyStr = line.slice(keyStart, keyEnd).trim();

    if (keyStr.length > 0) {
      const keyToken: YamlToken = {
        type: "scalar",
        startLine: lineNum,
        startCol: keyStart + 1,
        endLine: lineNum,
        endCol: keyStart + keyStr.length + 1,
        style: getScalarStyle(keyStr),
        value: stripQuotes(keyStr),
      };
      tokens.push(keyToken);
    }

    // Value indicator
    tokens.push({
      type: "value",
      startLine: lineNum,
      startCol: colonPos + 1,
      endLine: lineNum,
      endCol: colonPos + 2,
    });

    // Value
    let valStart = colonPos + 1;
    while (valStart < line.length && line[valStart] === " ") valStart++;

    if (valStart < line.length && line[valStart] !== "#") {
      const valEnd = findCommentStart(line, valStart);
      const valStr = line.slice(valStart, valEnd).trim();

      if (valStr.length > 0) {
        // Check for flow indicators in value
        if (valStr[0] === "{") {
          tokens.push({
            type: "flow-mapping-start",
            startLine: lineNum,
            startCol: valStart + 1,
            endLine: lineNum,
            endCol: valStart + 2,
          });
          tokenizeFlowContent(line, lineNum, valStart + 1, tokens);
          return;
        }
        if (valStr[0] === "[") {
          tokens.push({
            type: "flow-sequence-start",
            startLine: lineNum,
            startCol: valStart + 1,
            endLine: lineNum,
            endCol: valStart + 2,
          });
          tokenizeFlowContent(line, lineNum, valStart + 1, tokens);
          return;
        }
        if (valStr[0] === "&") {
          const anchorEnd = findWordEnd(line, valStart + 1);
          tokens.push({
            type: "anchor",
            startLine: lineNum,
            startCol: valStart + 1,
            endLine: lineNum,
            endCol: anchorEnd + 1,
            value: line.slice(valStart + 1, anchorEnd),
          });
          let afterAnchor = anchorEnd;
          while (afterAnchor < line.length && line[afterAnchor] === " ") afterAnchor++;
          if (afterAnchor < line.length && line[afterAnchor] !== "#") {
            const restEnd = findCommentStart(line, afterAnchor);
            const rest = line.slice(afterAnchor, restEnd).trim();
            if (rest.length > 0) {
              tokens.push({
                type: "scalar",
                startLine: lineNum,
                startCol: afterAnchor + 1,
                endLine: lineNum,
                endCol: afterAnchor + rest.length + 1,
                style: getScalarStyle(rest),
                value: stripQuotes(rest),
              });
            }
          }
          return;
        }
        if (valStr[0] === "*") {
          const aliasEnd = findWordEnd(line, valStart + 1);
          tokens.push({
            type: "alias",
            startLine: lineNum,
            startCol: valStart + 1,
            endLine: lineNum,
            endCol: aliasEnd + 1,
            value: line.slice(valStart + 1, aliasEnd),
          });
          return;
        }

        tokens.push({
          type: "scalar",
          startLine: lineNum,
          startCol: valStart + 1,
          endLine: lineNum,
          endCol: valStart + valStr.length + 1,
          style: getScalarStyle(valStr),
          value: stripQuotes(valStr),
        });
      }
    }
  } else {
    // Plain scalar (no colon found)
    const end = findCommentStart(line, col);
    const str = line.slice(col, end).trim();
    if (str.length > 0 && !str.startsWith("#")) {
      tokens.push({
        type: "scalar",
        startLine: lineNum,
        startCol: col + 1,
        endLine: lineNum,
        endCol: col + str.length + 1,
        style: getScalarStyle(str),
        value: stripQuotes(str),
      });
    }
  }
}

function tokenizeFlowContent(
  line: string,
  lineNum: number,
  startCol: number,
  tokens: YamlToken[],
): void {
  let col = startCol;
  while (col < line.length) {
    const ch = line[col];
    if (ch === " " || ch === "\t") {
      col++;
      continue;
    }
    if (ch === "}") {
      tokens.push({
        type: "flow-mapping-end",
        startLine: lineNum,
        startCol: col + 1,
        endLine: lineNum,
        endCol: col + 2,
      });
      col++;
    } else if (ch === "]") {
      tokens.push({
        type: "flow-sequence-end",
        startLine: lineNum,
        startCol: col + 1,
        endLine: lineNum,
        endCol: col + 2,
      });
      col++;
    } else if (ch === "{") {
      tokens.push({
        type: "flow-mapping-start",
        startLine: lineNum,
        startCol: col + 1,
        endLine: lineNum,
        endCol: col + 2,
      });
      col++;
    } else if (ch === "[") {
      tokens.push({
        type: "flow-sequence-start",
        startLine: lineNum,
        startCol: col + 1,
        endLine: lineNum,
        endCol: col + 2,
      });
      col++;
    } else if (ch === ",") {
      col++;
    } else if (ch === ":") {
      tokens.push({
        type: "value",
        startLine: lineNum,
        startCol: col + 1,
        endLine: lineNum,
        endCol: col + 2,
      });
      col++;
    } else if (ch === "#") {
      break;
    } else {
      // Scalar within flow
      const end = findFlowScalarEnd(line, col);
      const str = line.slice(col, end).trim();
      if (str.length > 0) {
        tokens.push({
          type: "scalar",
          startLine: lineNum,
          startCol: col + 1,
          endLine: lineNum,
          endCol: col + str.length + 1,
          style: getScalarStyle(str),
          value: stripQuotes(str),
        });
      }
      col = end;
    }
  }
}

function findFlowScalarEnd(line: string, start: number): number {
  let i = start;
  if (line[i] === '"' || line[i] === "'") {
    const quote = line[i];
    i++;
    while (i < line.length) {
      if (line[i] === quote && line[i - 1] !== "\\") {
        i++;
        break;
      }
      i++;
    }
    return i;
  }
  while (i < line.length && !",}]:".includes(line[i]) && line[i] !== " ") i++;
  return i;
}

function findWordEnd(line: string, start: number): number {
  let i = start;
  while (
    i < line.length &&
    line[i] !== " " &&
    line[i] !== "\t" &&
    line[i] !== "," &&
    line[i] !== "}" &&
    line[i] !== "]"
  )
    i++;
  return i;
}

function findMappingColon(line: string, start: number): number {
  let inSingle = false;
  let inDouble = false;

  for (let i = start; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble && ch === ":") {
      if (
        i + 1 >= line.length ||
        line[i + 1] === " " ||
        line[i + 1] === "\n" ||
        line[i + 1] === "\r"
      ) {
        return i;
      }
    }
  }
  return -1;
}

function findCommentStart(line: string, start: number): number {
  let inSingle = false;
  let inDouble = false;

  for (let i = start; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble && ch === "#" && i > 0 && line[i - 1] === " ") {
      return i;
    }
  }
  return line.length;
}

function getScalarStyle(str: string): string {
  if (str.startsWith("'")) return "single-quoted";
  if (str.startsWith('"')) return "double-quoted";
  if (str.startsWith("|") || str.startsWith(">")) return "block";
  return "plain";
}

function stripQuotes(str: string): string {
  if (str.length >= 2) {
    if (
      (str[0] === "'" && str[str.length - 1] === "'") ||
      (str[0] === '"' && str[str.length - 1] === '"')
    ) {
      return str.slice(1, -1);
    }
  }
  return str;
}

export function extractComments(source: string): Comment[] {
  const comments: Comment[] = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escaped = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === "\\" && inDoubleQuote) {
        escaped = true;
        continue;
      }

      if (ch === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (ch === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      if (!inSingleQuote && !inDoubleQuote && ch === "#") {
        if (j === 0 || line[j - 1] === " " || line[j - 1] === "\t") {
          const textBefore = line.slice(0, j).trim();
          comments.push({
            line: i + 1,
            column: j + 1,
            text: line.slice(j),
            tokenBefore: undefined,
            tokenAfter: undefined,
            inline: textBefore.length > 0,
          });
          break;
        }
      }
    }
  }

  return comments;
}

export function getLines(source: string): LineInfo[] {
  const lines: LineInfo[] = [];
  let start = 0;

  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") {
      const content = source.slice(start, i);
      const actualContent = content.endsWith("\r") ? content.slice(0, -1) : content;
      const end = content.endsWith("\r") ? "\r\n" : "\n";
      lines.push({ line: lines.length + 1, content: actualContent, end });
      start = i + 1;
    } else if (source[i] === "\r" && source[i + 1] !== "\n") {
      const content = source.slice(start, i);
      lines.push({ line: lines.length + 1, content, end: "\r" });
      start = i + 1;
    }
  }

  // Last line (no trailing newline)
  if (start <= source.length) {
    const content = source.slice(start);
    lines.push({ line: lines.length + 1, content, end: "" });
  }

  return lines;
}
