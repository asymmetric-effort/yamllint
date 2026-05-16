import { describe, it, expect } from "vitest";
import { lint } from "../../src/linter.js";
import { loadConfig } from "../../src/config.js";

describe("configuration integration", () => {
  it("relaxed config produces no errors for common patterns", () => {
    const source = "key: value\nanother: thing\n";
    const { resolved } = loadConfig(undefined, "extends: relaxed");
    const result = lint(source, resolved);
    const errors = result.problems.filter((p) => p.level === "error");
    expect(errors).toHaveLength(0);
  });

  it("custom line-length configuration", () => {
    const long = "key: " + "a".repeat(100) + "\n";
    const { resolved: strict } = loadConfig(
      undefined,
      "extends: default\nrules:\n  line-length:\n    max: 80\n  document-start: disable",
    );
    const { resolved: lenient } = loadConfig(
      undefined,
      "extends: default\nrules:\n  line-length:\n    max: 200\n  document-start: disable",
    );

    const strictResult = lint(long, strict);
    const lenientResult = lint(long, lenient);

    expect(strictResult.problems.filter((p) => p.rule === "line-length").length).toBeGreaterThan(0);
    expect(lenientResult.problems.filter((p) => p.rule === "line-length")).toHaveLength(0);
  });

  it("disabling all rules produces no problems", () => {
    const configData = [
      "rules:",
      "  anchors: disable",
      "  braces: disable",
      "  brackets: disable",
      "  colons: disable",
      "  commas: disable",
      "  comments: disable",
      "  comments-indentation: disable",
      "  document-end: disable",
      "  document-start: disable",
      "  empty-lines: disable",
      "  empty-values: disable",
      "  float-values: disable",
      "  hyphens: disable",
      "  indentation: disable",
      "  key-duplicates: disable",
      "  key-ordering: disable",
      "  line-length: disable",
      "  new-line-at-end-of-file: disable",
      "  new-lines: disable",
      "  octal-values: disable",
      "  quoted-strings: disable",
      "  trailing-spaces: disable",
      "  truthy: disable",
    ].join("\n");

    const { resolved } = loadConfig(undefined, configData);
    const result = lint("bad yaml{  \n  with problems\n", resolved);
    expect(result.problems.filter((p) => p.rule !== null)).toHaveLength(0);
  });

  it("comment directives suppress problems", () => {
    const source = [
      "---",
      "key: value   # yamllint disable-line rule:trailing-spaces",
      "",
    ].join("\n");
    const { resolved } = loadConfig(
      undefined,
      "extends: default\nrules:\n  trailing-spaces: enable",
    );
    const result = lint(source, resolved);
    const trailing = result.problems.filter((p) => p.rule === "trailing-spaces");
    expect(trailing).toHaveLength(0);
  });
});
