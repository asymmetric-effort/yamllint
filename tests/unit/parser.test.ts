import { describe, it, expect } from "vitest";
import { tokenize, extractComments, getLines } from "../../src/parser.js";

describe("tokenize", () => {
  it("produces stream-start and stream-end tokens", () => {
    const tokens = tokenize("");
    expect(tokens[0].type).toBe("stream-start");
    expect(tokens[tokens.length - 1].type).toBe("stream-end");
  });

  it("tokenizes a simple mapping", () => {
    const tokens = tokenize("key: value\n");
    const types = tokens.map((t) => t.type);
    expect(types).toContain("scalar");
    expect(types).toContain("value");
  });

  it("tokenizes document start marker", () => {
    const tokens = tokenize("---\nkey: value\n");
    const types = tokens.map((t) => t.type);
    expect(types).toContain("document-start");
  });

  it("tokenizes document end marker", () => {
    const tokens = tokenize("---\nkey: value\n...\n");
    const types = tokens.map((t) => t.type);
    expect(types).toContain("document-end");
  });

  it("tokenizes flow mapping", () => {
    const tokens = tokenize("{key: value}\n");
    const types = tokens.map((t) => t.type);
    expect(types).toContain("flow-mapping-start");
    expect(types).toContain("flow-mapping-end");
  });

  it("tokenizes flow sequence", () => {
    const tokens = tokenize("[1, 2, 3]\n");
    const types = tokens.map((t) => t.type);
    expect(types).toContain("flow-sequence-start");
    expect(types).toContain("flow-sequence-end");
  });

  it("tokenizes block entries", () => {
    const tokens = tokenize("- item1\n- item2\n");
    const types = tokens.map((t) => t.type);
    expect(types.filter((t) => t === "block-entry")).toHaveLength(2);
  });

  it("tokenizes anchors and aliases", () => {
    const tokens = tokenize("---\na: &anchor value\nb: *anchor\n");
    const types = tokens.map((t) => t.type);
    expect(types).toContain("anchor");
    expect(types).toContain("alias");
  });

  it("identifies scalar styles", () => {
    const tokens = tokenize("plain\n'single'\n\"double\"\n");
    const scalars = tokens.filter((t) => t.type === "scalar");
    expect(scalars.length).toBeGreaterThanOrEqual(1);
  });

  it("tracks line numbers correctly", () => {
    const tokens = tokenize("line1\nline2\nline3\n");
    const scalars = tokens.filter((t) => t.type === "scalar");
    expect(scalars[0].startLine).toBe(1);
  });
});

describe("extractComments", () => {
  it("extracts standalone comments", () => {
    const comments = extractComments("# comment\nkey: value\n");
    expect(comments).toHaveLength(1);
    expect(comments[0].line).toBe(1);
    expect(comments[0].inline).toBe(false);
  });

  it("extracts inline comments", () => {
    const comments = extractComments("key: value  # inline\n");
    expect(comments).toHaveLength(1);
    expect(comments[0].inline).toBe(true);
  });

  it("does not extract # inside strings", () => {
    const comments = extractComments('key: "value # not comment"\n');
    expect(comments).toHaveLength(0);
  });

  it("handles multiple comments", () => {
    const comments = extractComments("# first\nkey: value  # second\n# third\n");
    expect(comments).toHaveLength(3);
  });
});

describe("getLines", () => {
  it("splits content into lines", () => {
    const lines = getLines("line1\nline2\nline3\n");
    expect(lines).toHaveLength(4); // includes empty last line
    expect(lines[0].content).toBe("line1");
    expect(lines[0].line).toBe(1);
  });

  it("detects unix line endings", () => {
    const lines = getLines("line1\nline2\n");
    expect(lines[0].end).toBe("\n");
  });

  it("detects windows line endings", () => {
    const lines = getLines("line1\r\nline2\r\n");
    expect(lines[0].end).toBe("\r\n");
  });

  it("handles no trailing newline", () => {
    const lines = getLines("line1\nline2");
    expect(lines[lines.length - 1].end).toBe("");
  });
});
