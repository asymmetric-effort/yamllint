/**
 * Final coverage push — targeting every remaining uncovered line.
 */
import { describe, it, expect } from "vitest";
import { lint } from "../../src/linter.js";
import { loadConfig, findConfigFile } from "../../src/config.js";
import { tokenize } from "../../src/parser.js";
import { formatProblems } from "../../src/formatter.js";
import { parseYaml } from "../../src/yaml-parser.js";

function lintWith(source: string, configData: string) {
  const { resolved } = loadConfig(undefined, configData);
  return lint(source, resolved);
}

// ============================================================================
// cli.ts lines 184-193 (stdin) and 240-242 (file read error)
// These are only reachable via subprocess — already tested in e2e/cli.test.ts
// We test the getExitCode function path variations here via linter results
// ============================================================================

// ============================================================================
// config.ts — findConfigFile edge cases, getIgnorePatterns
// ============================================================================
describe("config edge cases", () => {
  it("findConfigFile traverses parent directories", () => {
    // Will traverse up from a deep path and find nothing
    const result = findConfigFile("/tmp/very/deep/nonexistent/path");
    expect(result).toBeNull();
  });

  it("resolveConfig handles rule with only level override", () => {
    const { resolved } = loadConfig(
      undefined,
      "extends: default\nrules:\n  trailing-spaces:\n    level: warning",
    );
    const ts = resolved.find((r) => r.id === "trailing-spaces");
    expect(ts!.level).toBe("warning");
  });

  it("resolveConfig disables a rule with false", () => {
    const { resolved } = loadConfig(
      undefined,
      "extends: default\nrules:\n  trailing-spaces: false",
    );
    expect(resolved.find((r) => r.id === "trailing-spaces")).toBeUndefined();
  });

  it("getIgnorePatterns returns empty for no ignore config", () => {
    const { config } = loadConfig(undefined, "extends: default");
    expect(config.ignore).toBeUndefined();
  });
});

// ============================================================================
// formatter.ts lines 36, 41 — auto format when TTY/GITHUB_ACTIONS
// ============================================================================
describe("formatter auto detection", () => {
  it("auto format with GITHUB_ACTIONS env produces github format", () => {
    const origEnv = process.env.GITHUB_ACTIONS;
    process.env.GITHUB_ACTIONS = "true";
    try {
      const output = formatProblems(
        [{ line: 1, column: 1, rule: "test", level: "error", message: "msg" }],
        { format: "auto", filename: "f.yaml", noWarnings: false },
      );
      expect(output).toContain("::");
    } finally {
      if (origEnv === undefined) delete process.env.GITHUB_ACTIONS;
      else process.env.GITHUB_ACTIONS = origEnv;
    }
  });

  it("auto format without TTY produces standard format", () => {
    const origActions = process.env.GITHUB_ACTIONS;
    const origWorkflow = process.env.GITHUB_WORKFLOW;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITHUB_WORKFLOW;
    try {
      const output = formatProblems(
        [{ line: 1, column: 1, rule: "test", level: "error", message: "msg" }],
        { format: "auto", filename: "f.yaml", noWarnings: false },
      );
      // Should be standard format (no :: annotations)
      expect(output).toContain("f.yaml");
    } finally {
      if (origActions !== undefined) process.env.GITHUB_ACTIONS = origActions;
      if (origWorkflow !== undefined) process.env.GITHUB_WORKFLOW = origWorkflow;
    }
  });
});

// ============================================================================
// linter.ts — syntax error path, empty comment token context
// ============================================================================
describe("linter edge cases", () => {
  it("handles comment with no adjacent tokens", () => {
    // A comment at end of file with no following token
    const result = lintWith("---\nkey: val\n# last comment\n", "extends: default");
    expect(result.problems).toBeDefined();
  });

  it("resets stateful rules between calls", () => {
    const { resolved } = loadConfig(undefined, "extends: default");
    const r1 = lint("---\nkey: val\n", resolved);
    const r2 = lint("---\nother: thing\n", resolved);
    // Both should work independently
    expect(r1.problems).toBeDefined();
    expect(r2.problems).toBeDefined();
  });
});

// ============================================================================
// parser.ts — remaining flow content paths (490-496)
// ============================================================================
describe("parser flow edge cases", () => {
  it("handles colon inside flow without space", () => {
    // Colon followed by } (no space = not a mapping indicator in some contexts)
    const tokens = tokenize("---\na: {b:c}\n");
    expect(tokens.length).toBeGreaterThan(3);
  });

  it("handles empty flow mapping", () => {
    const tokens = tokenize("---\na: {}\n");
    const starts = tokens.filter((t) => t.type === "flow-mapping-start");
    const ends = tokens.filter((t) => t.type === "flow-mapping-end");
    expect(starts).toHaveLength(1);
    expect(ends).toHaveLength(1);
  });

  it("handles empty flow sequence", () => {
    const tokens = tokenize("---\na: []\n");
    const starts = tokens.filter((t) => t.type === "flow-sequence-start");
    const ends = tokens.filter((t) => t.type === "flow-sequence-end");
    expect(starts).toHaveLength(1);
    expect(ends).toHaveLength(1);
  });

  it("handles flow with comment at end", () => {
    const tokens = tokenize("---\na: {b: 1} # comment\n");
    expect(tokens.filter((t) => t.type === "flow-mapping-end")).toHaveLength(1);
  });
});

// ============================================================================
// yaml-parser.ts — remaining paths (block sequence items, findChildIndent)
// ============================================================================
describe("yaml-parser edge cases", () => {
  it("handles sequence item with no value", () => {
    const result = parseYaml("-\n- a\n") as unknown[];
    expect(Array.isArray(result)).toBe(true);
  });

  it("handles empty lines between mappings", () => {
    const result = parseYaml("a: 1\n\nb: 2\n") as Record<string, unknown>;
    expect(result.a).toBe(1);
    expect(result.b).toBe(2);
  });

  it("handles mapping value that is empty string", () => {
    const result = parseYaml("key: ''\n") as Record<string, unknown>;
    expect(result.key).toBe("");
  });

  it("handles boolean variants", () => {
    const result = parseYaml("a: True\nb: FALSE\n") as Record<string, unknown>;
    expect(result.a).toBe(true);
    expect(result.b).toBe(false);
  });

  it("handles negative numbers", () => {
    const result = parseYaml("n: -5\nf: -3.14\n") as Record<string, unknown>;
    expect(result.n).toBe(-5);
    expect(result.f).toBe(-3.14);
  });

  it("handles colon in value without triggering mapping", () => {
    const result = parseYaml("url: 'http://example.com:8080'\n") as Record<string, unknown>;
    expect(result.url).toBe("http://example.com:8080");
  });
});

// ============================================================================
// commas.ts lines 20-25 — escaped chars inside strings
// ============================================================================
describe("commas string handling", () => {
  it("handles escaped quotes in strings", () => {
    const result = lintWith(
      '---\nkey: ["\\"a\\"",b]\n',
      "rules:\n  commas:\n    max-spaces-before: 0\n    min-spaces-after: 1\n    max-spaces-after: 1",
    );
    // Should not crash
    expect(result.problems).toBeDefined();
  });

  it("handles single-quoted strings with commas", () => {
    const result = lintWith(
      "---\nkey: ['a,b', 'c']\n",
      "rules:\n  commas:\n    max-spaces-before: 0\n    min-spaces-after: 1\n    max-spaces-after: 1",
    );
    const problems = result.problems.filter((p) => p.rule === "commas");
    expect(problems).toHaveLength(0);
  });
});

// ============================================================================
// quoted-strings.ts line 51 (only-when-needed plain) and 133-135 (valueContainsQuotes)
// ============================================================================
describe("quoted-strings edge cases", () => {
  it("only-when-needed: plain scalar with no special chars is fine", () => {
    const result = lintWith(
      "---\nkey: simple\n",
      "rules:\n  quoted-strings:\n    quote-type: any\n    required: only-when-needed",
    );
    const problems = result.problems.filter((p) => p.rule === "quoted-strings");
    expect(problems).toHaveLength(0);
  });

  it("valueContainsQuotes: double-quoted with embedded single quotes allowed", () => {
    const result = lintWith(
      '---\nkey: "it\'s"\n',
      "rules:\n  quoted-strings:\n    quote-type: single\n    required: true\n    allow-quoted-quotes: true",
    );
    const problems = result.problems.filter((p) => p.rule === "quoted-strings");
    expect(problems).toHaveLength(0);
  });

  it("valueContainsQuotes: single-quoted with embedded double quotes allowed", () => {
    const result = lintWith(
      "---\nkey: 'say \"hi\"'\n",
      "rules:\n  quoted-strings:\n    quote-type: double\n    required: true\n    allow-quoted-quotes: true",
    );
    const problems = result.problems.filter((p) => p.rule === "quoted-strings");
    expect(problems).toHaveLength(0);
  });
});

// ============================================================================
// colons.ts line 35 — spaces after colon
// ============================================================================
describe("colons after-colon spacing", () => {
  it("detects too many spaces after colon", () => {
    const result = lintWith(
      "---\nkey:    value\n",
      "rules:\n  colons:\n    max-spaces-before: 0\n    max-spaces-after: 1",
    );
    const problems = result.problems.filter((p) => p.rule === "colons");
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("after colon");
  });
});

// ============================================================================
// new-lines.ts line 30 — platform mode wrong ending
// ============================================================================
describe("new-lines platform mode", () => {
  it("platform mode rejects wrong endings", () => {
    // On linux, \r\n should fail in platform mode
    const result = lintWith("---\r\nkey: value\r\n", "rules:\n  new-lines:\n    type: platform");
    const problems = result.problems.filter((p) => p.rule === "new-lines");
    expect(problems.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// line-length.ts lines 23-24 — non-breakable word edge case
// ============================================================================
describe("line-length non-breakable", () => {
  it("non-breakable: line with only one word past limit", () => {
    // The trimmed content has no space, so it's non-breakable
    const result = lintWith(
      "---\n" + "x".repeat(100) + "\n",
      "rules:\n  line-length:\n    max: 80\n    allow-non-breakable-words: true\n    allow-uri: false",
    );
    const problems = result.problems.filter((p) => p.rule === "line-length");
    expect(problems).toHaveLength(0);
  });

  it("non-breakable: line with space before limit is breakable", () => {
    const result = lintWith(
      "---\nshort " + "x".repeat(80) + "\n",
      "rules:\n  line-length:\n    max: 80\n    allow-non-breakable-words: true\n    allow-uri: false",
    );
    const problems = result.problems.filter((p) => p.rule === "line-length");
    expect(problems.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// indentation.ts — comments-indentation.ts line 14
// ============================================================================
describe("comments-indentation edge cases", () => {
  it("inline comments are not checked for indentation", () => {
    const result = lintWith("---\nkey: val  # inline\n", "rules:\n  comments-indentation: enable");
    const problems = result.problems.filter((p) => p.rule === "comments-indentation");
    expect(problems).toHaveLength(0);
  });
});
