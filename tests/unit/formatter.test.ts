import { describe, it, expect } from "vitest";
import { formatProblems, hasErrors, hasWarnings } from "../../src/formatter.js";
import type { LintProblem } from "../../src/types.js";

const sampleProblems: LintProblem[] = [
  { line: 1, column: 5, rule: "trailing-spaces", level: "error", message: "trailing spaces" },
  { line: 3, column: 1, rule: "indentation", level: "warning", message: "wrong indentation" },
];

describe("formatProblems", () => {
  it("returns empty string for no problems", () => {
    const output = formatProblems([], {
      format: "standard",
      filename: "test.yaml",
      noWarnings: false,
    });
    expect(output).toBe("");
  });

  it("formats parsable output", () => {
    const output = formatProblems(sampleProblems, {
      format: "parsable",
      filename: "test.yaml",
      noWarnings: false,
    });
    expect(output).toContain("test.yaml:1:5:");
    expect(output).toContain("[error]");
    expect(output).toContain("(trailing-spaces)");
  });

  it("formats standard output", () => {
    const output = formatProblems(sampleProblems, {
      format: "standard",
      filename: "test.yaml",
      noWarnings: false,
    });
    expect(output).toContain("test.yaml");
    expect(output).toContain("1:5");
    expect(output).toContain("error");
  });

  it("formats github output", () => {
    const output = formatProblems(sampleProblems, {
      format: "github",
      filename: "test.yaml",
      noWarnings: false,
    });
    expect(output).toContain("::error file=test.yaml");
    expect(output).toContain("::warning file=test.yaml");
    expect(output).toContain("::group::");
    expect(output).toContain("::endgroup::");
  });

  it("filters warnings when noWarnings is true", () => {
    const output = formatProblems(sampleProblems, {
      format: "parsable",
      filename: "test.yaml",
      noWarnings: true,
    });
    expect(output).toContain("[error]");
    expect(output).not.toContain("[warning]");
  });
});

describe("hasErrors", () => {
  it("returns true when errors exist", () => {
    expect(hasErrors(sampleProblems)).toBe(true);
  });

  it("returns false when no errors", () => {
    expect(hasErrors([{ line: 1, column: 1, rule: "x", level: "warning", message: "w" }])).toBe(
      false,
    );
  });
});

describe("hasWarnings", () => {
  it("returns true when warnings exist", () => {
    expect(hasWarnings(sampleProblems)).toBe(true);
  });

  it("returns false when no warnings", () => {
    expect(hasWarnings([{ line: 1, column: 1, rule: "x", level: "error", message: "e" }])).toBe(
      false,
    );
  });
});
