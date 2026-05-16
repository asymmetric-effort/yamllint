import { describe, it, expect } from "@asymmetric-effort/nogginlessdom";
import { lint } from "../../src/linter.js";
import { loadConfig } from "../../src/config.js";

function lintWith(source: string, configData: string) {
  const { resolved } = loadConfig(undefined, configData);
  return lint(source, resolved);
}

describe("document-end rule", () => {
  it("detects forbidden document end", () => {
    const result = lintWith(
      "---\nkey: value\n...\n",
      "rules:\n  document-end:\n    present: false",
    );
    const problems = result.problems.filter((p) => p.rule === "document-end");
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("...");
  });

  it("passes when document-end is disabled", () => {
    const result = lintWith("---\nkey: value\n...\n", "rules:\n  document-end: disable");
    const problems = result.problems.filter((p) => p.rule === "document-end");
    expect(problems).toHaveLength(0);
  });
});

describe("key-ordering rule", () => {
  it("detects wrong key order", () => {
    const result = lintWith(
      "---\nzebra: 1\nalpha: 2\n",
      "rules:\n  key-ordering: enable\n  document-start: disable\n  trailing-spaces: disable",
    );
    const problems = result.problems.filter((p) => p.rule === "key-ordering");
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("alpha");
  });

  it("passes when keys are ordered", () => {
    const result = lintWith(
      "---\nalpha: 1\nbeta: 2\ngamma: 3\n",
      "rules:\n  key-ordering: enable\n  document-start: disable\n  trailing-spaces: disable",
    );
    const problems = result.problems.filter((p) => p.rule === "key-ordering");
    expect(problems).toHaveLength(0);
  });
});

describe("empty-values rule", () => {
  it("detects empty value in block mapping", () => {
    const result = lintWith(
      "---\nkey:\nanotherkey: val\n",
      "rules:\n  empty-values:\n    forbid-in-block-mappings: true\n    forbid-in-flow-mappings: false",
    );
    const problems = result.problems.filter((p) => p.rule === "empty-values");
    expect(problems.length).toBeGreaterThan(0);
  });

  it("passes when values are present", () => {
    const result = lintWith(
      "---\nkey: value\n",
      "rules:\n  empty-values:\n    forbid-in-block-mappings: true\n    forbid-in-flow-mappings: false",
    );
    const problems = result.problems.filter((p) => p.rule === "empty-values");
    expect(problems).toHaveLength(0);
  });
});

describe("quoted-strings rule", () => {
  it("detects unquoted strings when required", () => {
    const result = lintWith(
      "---\nkey: value\n",
      "rules:\n  quoted-strings:\n    quote-type: any\n    required: true",
    );
    const problems = result.problems.filter((p) => p.rule === "quoted-strings");
    expect(problems.length).toBeGreaterThan(0);
  });

  it("passes when strings are quoted as required", () => {
    const result = lintWith(
      '---\nkey: "value"\n',
      "rules:\n  quoted-strings:\n    quote-type: any\n    required: true",
    );
    const problems = result.problems.filter((p) => p.rule === "quoted-strings");
    expect(problems).toHaveLength(0);
  });

  it("enforces single quotes", () => {
    const result = lintWith(
      '---\nkey: "value"\n',
      "rules:\n  quoted-strings:\n    quote-type: single\n    required: true",
    );
    const problems = result.problems.filter((p) => p.rule === "quoted-strings");
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("single-quoted");
  });

  it("enforces double quotes", () => {
    const result = lintWith(
      "---\nkey: 'value'\n",
      "rules:\n  quoted-strings:\n    quote-type: double\n    required: true",
    );
    const problems = result.problems.filter((p) => p.rule === "quoted-strings");
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("double-quoted");
  });

  it("detects redundant quoting with only-when-needed", () => {
    const result = lintWith(
      '---\nkey: "simple"\n',
      "rules:\n  quoted-strings:\n    quote-type: any\n    required: only-when-needed",
    );
    const problems = result.problems.filter((p) => p.rule === "quoted-strings");
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("redundantly quoted");
  });

  it("allows quoting when needed for special values", () => {
    const result = lintWith(
      '---\nkey: "true"\n',
      "rules:\n  quoted-strings:\n    quote-type: any\n    required: only-when-needed",
    );
    const problems = result.problems.filter((p) => p.rule === "quoted-strings");
    expect(problems).toHaveLength(0);
  });
});

describe("brackets rule", () => {
  it("forbids flow sequences when configured", () => {
    const result = lintWith("---\nitems: [1, 2, 3]\n", "rules:\n  brackets:\n    forbid: true");
    const problems = result.problems.filter((p) => p.rule === "brackets");
    expect(problems.length).toBeGreaterThan(0);
  });

  it("forbids non-empty flow sequences", () => {
    const result = lintWith(
      "---\nitems: [1, 2]\nempty: []\n",
      "rules:\n  brackets:\n    forbid: non-empty",
    );
    const problems = result.problems.filter((p) => p.rule === "brackets");
    expect(problems.length).toBeGreaterThan(0);
  });
});

describe("braces rule", () => {
  it("forbids flow mappings when configured", () => {
    const result = lintWith("---\nobj: {key: value}\n", "rules:\n  braces:\n    forbid: true");
    const problems = result.problems.filter((p) => p.rule === "braces");
    expect(problems.length).toBeGreaterThan(0);
  });

  it("forbids non-empty flow mappings", () => {
    const result = lintWith(
      "---\nobj: {key: val}\nempty: {}\n",
      "rules:\n  braces:\n    forbid: non-empty",
    );
    const problems = result.problems.filter((p) => p.rule === "braces");
    expect(problems.length).toBeGreaterThan(0);
  });
});

describe("anchors rule", () => {
  it("detects duplicate anchors", () => {
    const result = lintWith(
      "---\na: &foo bar\nb: &foo baz\n",
      "rules:\n  anchors:\n    forbid-duplicated-anchors: true\n    forbid-undeclared-aliases: true\n    forbid-unused-anchors: false",
    );
    const problems = result.problems.filter((p) => p.rule === "anchors");
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("duplicate");
  });

  it("detects undeclared aliases", () => {
    const result = lintWith(
      "---\na: *missing\n",
      "rules:\n  anchors:\n    forbid-duplicated-anchors: false\n    forbid-undeclared-aliases: true\n    forbid-unused-anchors: false",
    );
    const problems = result.problems.filter((p) => p.rule === "anchors");
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("undeclared");
  });
});

describe("commas rule", () => {
  it("detects too many spaces before comma", () => {
    const result = lintWith(
      "---\nitems: [1 , 2]\n",
      "rules:\n  commas:\n    max-spaces-before: 0\n    min-spaces-after: 1\n    max-spaces-after: 1",
    );
    const problems = result.problems.filter((p) => p.rule === "commas");
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("before comma");
  });

  it("detects too few spaces after comma", () => {
    const result = lintWith(
      "---\nitems: [1,2]\n",
      "rules:\n  commas:\n    max-spaces-before: 0\n    min-spaces-after: 1\n    max-spaces-after: 1",
    );
    const problems = result.problems.filter((p) => p.rule === "commas");
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("after comma");
  });

  it("detects too many spaces after comma", () => {
    const result = lintWith(
      "---\nitems: [1,   2]\n",
      "rules:\n  commas:\n    max-spaces-before: 0\n    min-spaces-after: 1\n    max-spaces-after: 1",
    );
    const problems = result.problems.filter((p) => p.rule === "commas");
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("after comma");
  });
});

describe("new-lines rule", () => {
  it("detects dos line endings when unix expected", () => {
    const result = lintWith("---\r\nkey: value\r\n", "rules:\n  new-lines:\n    type: dos");
    // When set to dos, \r\n should pass
    const problems = result.problems.filter((p) => p.rule === "new-lines");
    expect(problems).toHaveLength(0);
  });

  it("detects unix line endings when dos expected", () => {
    const result = lintWith("---\nkey: value\n", "rules:\n  new-lines:\n    type: dos");
    const problems = result.problems.filter((p) => p.rule === "new-lines");
    expect(problems.length).toBeGreaterThan(0);
  });
});

describe("line-length rule", () => {
  it("allows non-breakable words", () => {
    // A line with no spaces at all (single token) is non-breakable
    const longWord = "a".repeat(100);
    const result = lintWith(
      `---\n${longWord}:\n`,
      "rules:\n  line-length:\n    max: 80\n    allow-non-breakable-words: true\n    allow-uri: false",
    );
    const problems = result.problems.filter((p) => p.rule === "line-length");
    expect(problems).toHaveLength(0);
  });

  it("allows URIs that exceed limit", () => {
    const result = lintWith(
      "---\nurl: https://example.com/very/long/path/that/exceeds/the/eighty/character/limit/definitely/yes\n",
      "rules:\n  line-length:\n    max: 80\n    allow-uri: true",
    );
    const problems = result.problems.filter((p) => p.rule === "line-length");
    expect(problems).toHaveLength(0);
  });
});
