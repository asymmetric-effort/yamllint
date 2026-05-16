import { Lexer } from "yaml";
import type { Comment, LineInfo, YamlToken, YamlTokenType } from "./types.js";

interface Position {
  line: number;
  col: number;
}

function offsetToPosition(source: string, offset: number): Position {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

export function tokenize(source: string): YamlToken[] {
  const tokens: YamlToken[] = [];
  const lexer = new Lexer();
  let offset = 0;

  for (const raw of lexer.lex(source)) {
    // Synthetic control chars from the yaml lexer - don't advance source offset
    if (raw === "\x02" || raw === "\x18" || raw === "\x1f") {
      continue;
    }

    const type = classifyToken(raw);
    if (type) {
      const start = offsetToPosition(source, offset);
      const endOffset = offset + raw.length;
      const end = offsetToPosition(source, endOffset);
      const token: YamlToken = {
        type,
        startLine: start.line,
        startCol: start.col,
        endLine: end.line,
        endCol: end.col,
      };

      if (type === "scalar") {
        // Strip quotes for value extraction
        if (raw.startsWith("'") && raw.endsWith("'")) {
          token.value = raw.slice(1, -1);
          token.style = "single-quoted";
        } else if (raw.startsWith('"') && raw.endsWith('"')) {
          token.value = raw.slice(1, -1);
          token.style = "double-quoted";
        } else if (raw.startsWith("|") || raw.startsWith(">")) {
          token.value = raw;
          token.style = "block";
        } else {
          token.value = raw.trim();
          token.style = "plain";
        }
      } else if (type === "anchor") {
        token.value = raw.slice(1).trim();
      } else if (type === "alias") {
        token.value = raw.slice(1).trim();
      } else if (type === "tag") {
        token.value = raw.trim();
      }

      tokens.push(token);
    }
    offset += raw.length;
  }

  // Wrap with stream markers
  const streamStart: YamlToken = {
    type: "stream-start",
    startLine: 1,
    startCol: 1,
    endLine: 1,
    endCol: 1,
  };
  const lastPos = offsetToPosition(source, source.length);
  const streamEnd: YamlToken = {
    type: "stream-end",
    startLine: lastPos.line,
    startCol: lastPos.col,
    endLine: lastPos.line,
    endCol: lastPos.col,
  };

  return [streamStart, ...tokens, streamEnd];
}

function classifyToken(raw: string): YamlTokenType | null {
  // Whitespace and newlines
  if (raw === "\n" || raw === "\r\n" || raw === "\r") return null;
  if (/^[ \t]+$/.test(raw)) return null;

  // Document markers
  if (raw === "---" || raw === "---\n" || raw === "--- " || raw.match(/^---[\s]?$/)) {
    return "document-start";
  }
  if (raw === "..." || raw === "...\n" || raw === "... " || raw.match(/^\.\.\.[\s]?$/)) {
    return "document-end";
  }

  // Block entry (list item)
  if (raw === "-" || raw === "- " || raw === "-\n") return "block-entry";

  // Explicit key
  if (raw === "?" || raw === "? ") return "key";

  // Value indicator
  if (raw === ":" || raw === ": " || raw === ":\n" || raw === ":\r\n") return "value";

  // Flow indicators
  if (raw === "{") return "flow-mapping-start";
  if (raw === "}") return "flow-mapping-end";
  if (raw === "[") return "flow-sequence-start";
  if (raw === "]") return "flow-sequence-end";

  // Anchor
  if (raw.startsWith("&") && raw.length > 1) return "anchor";

  // Alias
  if (raw.startsWith("*") && raw.length > 1) return "alias";

  // Tag
  if (raw.startsWith("!")) return "tag";

  // Comments (skip)
  if (raw.startsWith("#")) return null;

  // Directives (skip)
  if (raw.startsWith("%")) return null;

  // Quoted scalars
  if (raw.startsWith("'") || raw.startsWith('"')) return "scalar";

  // Block scalars
  if (raw.startsWith("|") || raw.startsWith(">")) return "scalar";

  // Comma (part of flow - skip as structural)
  if (raw === "," || raw === ", ") return null;

  // Plain scalars - anything else that has non-whitespace content
  if (raw.trim().length > 0) return "scalar";

  return null;
}

export function extractComments(source: string): Comment[] {
  const comments: Comment[] = [];
  const lines = source.split(/\n/);

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
        // Must be preceded by whitespace (or be at start of line) to be a comment
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

  // Split preserving line endings
  let start = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") {
      const content = source.slice(start, i);
      // Check for \r\n
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
