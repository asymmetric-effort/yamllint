import { describe, it, expect } from "vitest";
import { lint } from "../../src/linter.js";
import { loadConfig } from "../../src/config.js";

function onlyRule(source: string, rule: string, config: string = "") {
  const allRules = [
    "anchors", "braces", "brackets", "colons", "commas", "comments",
    "comments-indentation", "document-end", "document-start", "empty-lines",
    "empty-values", "float-values", "hyphens", "indentation", "key-duplicates",
    "key-ordering", "line-length", "new-line-at-end-of-file", "new-lines",
    "octal-values", "quoted-strings", "trailing-spaces", "truthy",
  ];
  const ruleLines = allRules.map((r) => {
    if (r === rule) {
      return config ? `  ${r}:\n${config}` : `  ${r}: enable`;
    }
    return `  ${r}: disable`;
  });
  const configData = `rules:\n${ruleLines.join("\n")}`;
  const { resolved } = loadConfig(undefined, configData);
  return lint(source, resolved);
}

describe("trailing-spaces rule", () => {
  it("detects trailing spaces", () => {
    const result = onlyRule("hello   \n", "trailing-spaces");
    expect(result.problems.length).toBeGreaterThan(0);
    expect(result.problems[0].rule).toBe("trailing-spaces");
  });

  it("passes for clean lines", () => {
    const result = onlyRule("hello\n", "trailing-spaces");
    expect(result.problems.filter((p) => p.rule === "trailing-spaces")).toHaveLength(0);
  });
});

describe("line-length rule", () => {
  it("detects lines over max", () => {
    const long = "k: " + "a".repeat(80) + "\n";
    const result = onlyRule(long, "line-length", "    max: 80");
    expect(result.problems.filter((p) => p.rule === "line-length").length).toBeGreaterThan(0);
  });

  it("allows lines under max", () => {
    const result = onlyRule("short: line\n", "line-length", "    max: 80");
    expect(result.problems.filter((p) => p.rule === "line-length")).toHaveLength(0);
  });

  it("allows URIs when configured", () => {
    const result = onlyRule(
      "url: https://example.com/very/long/path/that/exceeds/eighty/characters/in/total/length/definitely\n",
      "line-length",
      "    max: 80\n    allow-uri: true",
    );
    expect(result.problems.filter((p) => p.rule === "line-length")).toHaveLength(0);
  });
});

describe("new-lines rule", () => {
  it("detects CRLF when unix expected", () => {
    const result = onlyRule("key: value\r\n", "new-lines", "    type: unix");
    expect(result.problems.filter((p) => p.rule === "new-lines").length).toBeGreaterThan(0);
  });

  it("passes LF when unix expected", () => {
    const result = onlyRule("key: value\n", "new-lines", "    type: unix");
    expect(result.problems.filter((p) => p.rule === "new-lines")).toHaveLength(0);
  });
});

describe("truthy rule", () => {
  it("detects yes/no truthy values", () => {
    const result = onlyRule("key: yes\n", "truthy", "    allowed-values: [\"true\", \"false\"]");
    expect(result.problems.filter((p) => p.rule === "truthy").length).toBeGreaterThan(0);
  });

  it("allows true/false", () => {
    const result = onlyRule("key: true\n", "truthy", "    allowed-values: [\"true\", \"false\"]");
    expect(result.problems.filter((p) => p.rule === "truthy")).toHaveLength(0);
  });
});

describe("indentation rule", () => {
  it("detects tab characters", () => {
    const result = onlyRule("\tkey: value\n", "indentation", "    spaces: 2");
    expect(result.problems.filter((p) => p.rule === "indentation").length).toBeGreaterThan(0);
  });

  it("detects wrong indentation amount", () => {
    const result = onlyRule("parent:\n   child: value\n", "indentation", "    spaces: 2");
    expect(result.problems.filter((p) => p.rule === "indentation").length).toBeGreaterThan(0);
  });
});

describe("empty-lines rule", () => {
  it("detects too many consecutive empty lines", () => {
    const result = onlyRule("a: 1\n\n\n\nb: 2\n", "empty-lines", "    max: 2\n    max-start: 0\n    max-end: 0");
    expect(result.problems.filter((p) => p.rule === "empty-lines").length).toBeGreaterThan(0);
  });
});

describe("document-start rule", () => {
  it("detects missing document start", () => {
    const result = onlyRule("key: value\n", "document-start", "    present: true");
    expect(result.problems.filter((p) => p.rule === "document-start").length).toBeGreaterThan(0);
  });

  it("passes when document start present", () => {
    const result = onlyRule("---\nkey: value\n", "document-start", "    present: true");
    expect(result.problems.filter((p) => p.rule === "document-start")).toHaveLength(0);
  });

  it("detects forbidden document start", () => {
    const result = onlyRule("---\nkey: value\n", "document-start", "    present: false");
    expect(result.problems.filter((p) => p.rule === "document-start").length).toBeGreaterThan(0);
  });
});

describe("octal-values rule", () => {
  it("detects implicit octal", () => {
    const result = onlyRule("key: 0777\n", "octal-values", "    forbid-implicit-octal: true\n    forbid-explicit-octal: true");
    expect(result.problems.filter((p) => p.rule === "octal-values").length).toBeGreaterThan(0);
  });

  it("detects explicit octal", () => {
    const result = onlyRule("key: 0o777\n", "octal-values", "    forbid-implicit-octal: true\n    forbid-explicit-octal: true");
    expect(result.problems.filter((p) => p.rule === "octal-values").length).toBeGreaterThan(0);
  });
});

describe("float-values rule", () => {
  it("detects scientific notation", () => {
    const result = onlyRule("key: 1.0e6\n", "float-values", "    forbid-scientific-notation: true\n    forbid-nan: false\n    forbid-inf: false");
    expect(result.problems.filter((p) => p.rule === "float-values").length).toBeGreaterThan(0);
  });

  it("detects NaN", () => {
    const result = onlyRule("key: .nan\n", "float-values", "    forbid-scientific-notation: false\n    forbid-nan: true\n    forbid-inf: false");
    expect(result.problems.filter((p) => p.rule === "float-values").length).toBeGreaterThan(0);
  });
});
