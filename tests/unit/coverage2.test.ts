/**
 * Additional targeted tests to push coverage above 98%.
 */
import { describe, it, expect } from "@asymmetric-effort/nogginlessdom";
import { lint } from "../../src/linter.js";
import { loadConfig } from "../../src/config.js";
import { tokenize } from "../../src/parser.js";
import { parseYaml } from "../../src/yaml-parser.js";
import { minimatch } from "../../src/minimatch.js";

function lintWith(source: string, configData: string) {
  const { resolved } = loadConfig(undefined, configData);
  return lint(source, resolved);
}

// ============================================================================
// brackets.ts — empty bracket spacing, min/max spaces at close
// ============================================================================
describe("brackets spacing coverage", () => {
  it("detects too few spaces inside empty brackets", () => {
    const result = lintWith(
      "---\nitems: []\n",
      "rules:\n  brackets:\n    min-spaces-inside: 0\n    max-spaces-inside: 0\n    min-spaces-inside-empty: 1\n    max-spaces-inside-empty: 1",
    );
    const problems = result.problems.filter((p) => p.rule === "brackets");
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("too few");
  });

  it("detects too many spaces inside empty brackets", () => {
    const result = lintWith(
      "---\nitems: [   ]\n",
      "rules:\n  brackets:\n    min-spaces-inside: 0\n    max-spaces-inside: 0\n    min-spaces-inside-empty: 0\n    max-spaces-inside-empty: 0",
    );
    const problems = result.problems.filter((p) => p.rule === "brackets");
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("too many");
  });

  it("detects too few spaces at opening bracket", () => {
    const result = lintWith(
      "---\nitems: [1, 2]\n",
      "rules:\n  brackets:\n    min-spaces-inside: 1\n    max-spaces-inside: 3",
    );
    const problems = result.problems.filter((p) => p.rule === "brackets");
    expect(problems.length).toBeGreaterThan(0);
  });

  it("passes with correct spacing", () => {
    const result = lintWith(
      "---\nitems: [ 1, 2 ]\n",
      "rules:\n  brackets:\n    min-spaces-inside: 1\n    max-spaces-inside: 1",
    );
    const problems = result.problems.filter((p) => p.rule === "brackets");
    expect(problems).toHaveLength(0);
  });
});

// ============================================================================
// braces.ts — empty brace spacing
// ============================================================================
describe("braces spacing coverage", () => {
  it("detects too few spaces inside empty braces", () => {
    const result = lintWith(
      "---\nobj: {}\n",
      "rules:\n  braces:\n    min-spaces-inside: 0\n    max-spaces-inside: 0\n    min-spaces-inside-empty: 1\n    max-spaces-inside-empty: 1",
    );
    const problems = result.problems.filter((p) => p.rule === "braces");
    expect(problems.length).toBeGreaterThan(0);
  });

  it("detects too many spaces inside empty braces", () => {
    const result = lintWith(
      "---\nobj: {   }\n",
      "rules:\n  braces:\n    min-spaces-inside: 0\n    max-spaces-inside: 0\n    min-spaces-inside-empty: 0\n    max-spaces-inside-empty: 0",
    );
    const problems = result.problems.filter((p) => p.rule === "braces");
    expect(problems.length).toBeGreaterThan(0);
  });

  it("detects too few spaces at opening brace", () => {
    const result = lintWith(
      "---\nobj: {a: 1}\n",
      "rules:\n  braces:\n    min-spaces-inside: 1\n    max-spaces-inside: 3",
    );
    const problems = result.problems.filter((p) => p.rule === "braces");
    expect(problems.length).toBeGreaterThan(0);
  });

  it("detects too many spaces at opening brace", () => {
    const result = lintWith(
      "---\nobj: {   a: 1}\n",
      "rules:\n  braces:\n    min-spaces-inside: 0\n    max-spaces-inside: 0",
    );
    const problems = result.problems.filter((p) => p.rule === "braces");
    expect(problems.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// parser.ts — remaining uncovered paths
// ============================================================================
describe("parser additional coverage", () => {
  it("tokenizes anchor in value position", () => {
    const tokens = tokenize("---\na: &foo bar\n");
    const anchors = tokens.filter((t) => t.type === "anchor");
    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors[0].value).toBe("foo");
  });

  it("tokenizes alias in value position", () => {
    const tokens = tokenize("---\na: &foo bar\nb: *foo\n");
    const aliases = tokens.filter((t) => t.type === "alias");
    expect(aliases.length).toBeGreaterThan(0);
    expect(aliases[0].value).toBe("foo");
  });

  it("tokenizes flow with nested braces", () => {
    const tokens = tokenize("---\na: {b: {c: 1}}\n");
    const starts = tokens.filter((t) => t.type === "flow-mapping-start");
    expect(starts.length).toBe(2);
  });

  it("handles block scalar headers in value", () => {
    const tokens = tokenize("---\ntext: >\n  folded\n  text\n");
    const scalars = tokens.filter((t) => t.type === "scalar" && t.style === "block");
    expect(scalars.length).toBeGreaterThan(0);
  });

  it("tokenizes list items", () => {
    const tokens = tokenize("---\n- item1\n- item2\n- item3\n");
    const entries = tokens.filter((t) => t.type === "block-entry");
    expect(entries).toHaveLength(3);
  });

  it("handles comment after flow content", () => {
    const tokens = tokenize("---\na: [1, 2] # comment\n");
    expect(tokens.filter((t) => t.type === "flow-sequence-start")).toHaveLength(1);
  });

  it("handles quoted scalars in flow", () => {
    const tokens = tokenize('---\na: {"key": "val"}\n');
    const dq = tokens.filter((t) => t.type === "scalar" && t.style === "double-quoted");
    expect(dq.length).toBeGreaterThanOrEqual(2);
  });

  it("handles single quoted scalars in flow", () => {
    const tokens = tokenize("---\na: {'key': 'val'}\n");
    const sq = tokens.filter((t) => t.type === "scalar" && t.style === "single-quoted");
    expect(sq.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// yaml-parser.ts — edge cases
// ============================================================================
describe("yaml-parser additional coverage", () => {
  it("parses mapping with inline comment", () => {
    const result = parseYaml("key: value # comment\n") as Record<string, unknown>;
    expect(result.key).toBe("value");
  });

  it("parses single-quoted strings", () => {
    const result = parseYaml("key: 'hello world'\n") as Record<string, unknown>;
    expect(result.key).toBe("hello world");
  });

  it("parses flow mapping in value position", () => {
    const result = parseYaml("a: {b: 1, c: 2}\n") as Record<string, unknown>;
    expect((result.a as Record<string, unknown>).b).toBe(1);
    expect((result.a as Record<string, unknown>).c).toBe(2);
  });

  it("parses empty mapping", () => {
    const result = parseYaml("{}\n");
    expect(result).toEqual({});
  });

  it("parses empty sequence", () => {
    const result = parseYaml("[]\n");
    expect(result).toEqual([]);
  });

  it("parses sequence with nested mapping", () => {
    const result = parseYaml("- key: val\n- other: thing\n") as unknown[];
    expect(Array.isArray(result)).toBe(true);
    expect((result[0] as Record<string, unknown>).key).toBe("val");
  });

  it("parses deeply nested structures", () => {
    const result = parseYaml("a:\n  b:\n    c: deep\n") as Record<string, unknown>;
    const a = result.a as Record<string, unknown>;
    const b = a.b as Record<string, unknown>;
    expect(b.c).toBe("deep");
  });

  it("handles block scalar with > indicator", () => {
    const result = parseYaml("text: >\n  folded\n  content\n") as Record<string, unknown>;
    expect(typeof result.text).toBe("string");
  });

  it("handles multiple documents (only first)", () => {
    const result = parseYaml("---\na: 1\n---\nb: 2\n") as Record<string, unknown>;
    expect(result.a).toBe(1);
  });
});

// ============================================================================
// config.ts — remaining branches
// ============================================================================
describe("config additional coverage", () => {
  it("handles ignore-from-file option", () => {
    const { config } = loadConfig(undefined, "extends: default\nignore-from-file: []");
    expect(config).toBeDefined();
  });

  it("handles yaml-files option", () => {
    const { config } = loadConfig(
      undefined,
      "extends: default\nyaml-files:\n  - '*.yaml'\n  - '*.yml'",
    );
    expect(config).toBeDefined();
  });
});

// ============================================================================
// minimatch.ts — remaining patterns
// ============================================================================
describe("minimatch additional coverage", () => {
  it("handles trailing *", () => {
    expect(minimatch("file.yaml", "file*")).toBe(true);
    expect(minimatch("file.txt", "file*")).toBe(true);
  });

  it("handles * in middle", () => {
    expect(minimatch("file.yaml", "f*.yaml")).toBe(true);
    expect(minimatch("foo.yaml", "f*.yaml")).toBe(true);
  });

  it("handles multiple *", () => {
    expect(minimatch("abc.def", "*.*")).toBe(true);
    expect(minimatch("noext", "*.*")).toBe(false);
  });

  it("** at end matches everything", () => {
    expect(minimatch("a/b/c/d.yaml", "a/**")).toBe(true);
  });

  it("backtracking with * at boundary", () => {
    expect(minimatch("abcdef", "a*f")).toBe(true);
    expect(minimatch("abcdef", "a*z")).toBe(false);
  });

  it("character class at end of pattern", () => {
    expect(minimatch("test1", "test[0-9]")).toBe(true);
    expect(minimatch("testa", "test[0-9]")).toBe(false);
  });

  it("** with prefix path", () => {
    expect(minimatch("src/foo/bar.ts", "src/**")).toBe(true);
  });

  it("complex nested pattern", () => {
    expect(minimatch("tests/fixtures/file.yaml", "tests/**/*.yaml")).toBe(true);
    expect(minimatch("tests/fixtures/file.txt", "tests/**/*.yaml")).toBe(false);
  });
});

// ============================================================================
// linter.ts — syntax error path and comment enrichment
// ============================================================================
describe("linter additional coverage", () => {
  it("handles comments not adjacent to tokens", () => {
    const result = lintWith("---\n# standalone comment\nkey: val\n", "extends: default");
    expect(result.problems).toBeDefined();
  });

  it("handles file with multiple problems on same line", () => {
    const result = lintWith("key: value   \n", "extends: default");
    // Should have both document-start and trailing-spaces
    const rules = new Set(result.problems.map((p) => p.rule));
    expect(rules.size).toBeGreaterThan(1);
  });
});

// ============================================================================
// commas.ts — escape handling
// ============================================================================
describe("commas additional coverage", () => {
  it("ignores commas inside strings", () => {
    const result = lintWith(
      '---\nkey: "a,b,c"\n',
      "rules:\n  commas:\n    max-spaces-before: 0\n    min-spaces-after: 1\n    max-spaces-after: 1",
    );
    const problems = result.problems.filter((p) => p.rule === "commas");
    expect(problems).toHaveLength(0);
  });

  it("ignores commas after comment marker", () => {
    const result = lintWith(
      "---\nkey: val  # has,commas,here\n",
      "rules:\n  commas:\n    max-spaces-before: 0\n    min-spaces-after: 1\n    max-spaces-after: 1",
    );
    const problems = result.problems.filter((p) => p.rule === "commas");
    expect(problems).toHaveLength(0);
  });
});

// ============================================================================
// quoted-strings.ts — allow-quoted-quotes
// ============================================================================
describe("quoted-strings additional coverage", () => {
  it("allows quoted quotes when configured", () => {
    // Double-quoted string containing single quote, with single-quote preference
    const result = lintWith(
      '---\nkey: "it\'s fine"\n',
      "rules:\n  quoted-strings:\n    quote-type: single\n    required: true\n    allow-quoted-quotes: true",
    );
    const problems = result.problems.filter((p) => p.rule === "quoted-strings");
    expect(problems).toHaveLength(0);
  });
});
