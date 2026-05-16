import { describe, it, expect } from "vitest";
import { lint } from "../../src/linter.js";
import { loadConfig } from "../../src/config.js";

function lintWithDefaults(source: string) {
  const { resolved } = loadConfig();
  return lint(source, resolved);
}

function lintWithConfig(source: string, configData: string) {
  const { resolved } = loadConfig(undefined, configData);
  return lint(source, resolved);
}

describe("linter", () => {
  it("returns no problems for valid YAML", () => {
    const result = lintWithDefaults("---\nkey: value\n");
    const errors = result.problems.filter((p) => p.level === "error");
    expect(errors).toHaveLength(0);
  });

  it("detects trailing spaces", () => {
    const result = lintWithConfig("---\nkey: value   \n", "extends: default");
    const trailing = result.problems.filter((p) => p.rule === "trailing-spaces");
    expect(trailing.length).toBeGreaterThan(0);
  });

  it("detects line too long", () => {
    const long = "a".repeat(81);
    const result = lintWithConfig(`---\nkey: ${long}\n`, "extends: default");
    const lineLen = result.problems.filter((p) => p.rule === "line-length");
    expect(lineLen.length).toBeGreaterThan(0);
  });

  it("detects missing document start", () => {
    const result = lintWithDefaults("key: value\n");
    const docStart = result.problems.filter((p) => p.rule === "document-start");
    expect(docStart.length).toBeGreaterThan(0);
  });

  it("detects too many empty lines", () => {
    const result = lintWithConfig("---\nkey: value\n\n\n\ntoo: many\n", "extends: default");
    const emptyLines = result.problems.filter((p) => p.rule === "empty-lines");
    expect(emptyLines.length).toBeGreaterThan(0);
  });

  it("detects truthy values", () => {
    const result = lintWithDefaults("---\nenabled: yes\n");
    const truthy = result.problems.filter((p) => p.rule === "truthy");
    expect(truthy.length).toBeGreaterThan(0);
  });

  it("sorts problems by line and column", () => {
    const result = lintWithDefaults("key: value   \n");
    for (let i = 1; i < result.problems.length; i++) {
      const prev = result.problems[i - 1];
      const curr = result.problems[i];
      expect(prev.line <= curr.line).toBe(true);
      if (prev.line === curr.line) {
        expect(prev.column <= curr.column).toBe(true);
      }
    }
  });

  it("respects disabled rules", () => {
    const result = lintWithConfig("---\nkey: value   \n", "extends: default\nrules:\n  trailing-spaces: disable");
    const trailing = result.problems.filter((p) => p.rule === "trailing-spaces");
    expect(trailing).toHaveLength(0);
  });

  it("detects missing newline at end of file", () => {
    const result = lintWithConfig("---\nkey: value", "extends: default");
    const newline = result.problems.filter((p) => p.rule === "new-line-at-end-of-file");
    expect(newline.length).toBeGreaterThan(0);
  });
});
