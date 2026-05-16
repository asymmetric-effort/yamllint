import { describe, it, expect } from "vitest";
import { parseDirectives, isDisabled, filterProblems } from "../../src/directives.js";
import type { LintProblem } from "../../src/types.js";

describe("parseDirectives", () => {
  it("detects disable-file directive", () => {
    const { disabledFile } = parseDirectives("# yamllint disable-file\nkey: value\n");
    expect(disabledFile).toBe(true);
  });

  it("detects disable-line directive", () => {
    const { disabledLines } = parseDirectives("key: value  # yamllint disable-line\n");
    expect(disabledLines.has(1)).toBe(true);
    expect(disabledLines.get(1)).toBeNull(); // all rules
  });

  it("detects disable-line with specific rules", () => {
    const { disabledLines } = parseDirectives(
      "key: value  # yamllint disable-line rule:line-length\n",
    );
    expect(disabledLines.has(1)).toBe(true);
    const rules = disabledLines.get(1);
    expect(rules).toBeInstanceOf(Set);
    expect(rules!.has("line-length")).toBe(true);
  });

  it("detects disable/enable blocks", () => {
    const source = [
      "# yamllint disable rule:trailing-spaces",
      "key: value   ",
      "# yamllint enable rule:trailing-spaces",
      "clean: line",
    ].join("\n");
    const { disabledLines } = parseDirectives(source);
    expect(disabledLines.has(2)).toBe(true);
    expect(disabledLines.has(4)).toBe(false);
  });

  it("detects disable-all block", () => {
    const source = ["# yamllint disable", "any: thing", "# yamllint enable"].join("\n");
    const { disabledLines } = parseDirectives(source);
    expect(disabledLines.get(2)).toBeNull();
  });
});

describe("isDisabled", () => {
  it("returns false for lines not in map", () => {
    const map = new Map<number, Set<string> | null>();
    expect(isDisabled(map, 5, "trailing-spaces")).toBe(false);
  });

  it("returns true when all rules disabled (null)", () => {
    const map = new Map<number, Set<string> | null>([[1, null]]);
    expect(isDisabled(map, 1, "any-rule")).toBe(true);
  });

  it("returns true for specific disabled rule", () => {
    const map = new Map<number, Set<string> | null>([[1, new Set(["trailing-spaces"])]]);
    expect(isDisabled(map, 1, "trailing-spaces")).toBe(true);
    expect(isDisabled(map, 1, "line-length")).toBe(false);
  });
});

describe("filterProblems", () => {
  it("returns empty array when file is disabled", () => {
    const problems: LintProblem[] = [
      { line: 1, column: 1, rule: "test", level: "error", message: "msg" },
    ];
    const result = filterProblems(problems, new Map(), true);
    expect(result).toHaveLength(0);
  });

  it("filters problems on disabled lines", () => {
    const problems: LintProblem[] = [
      { line: 1, column: 1, rule: "trailing-spaces", level: "error", message: "msg" },
      { line: 2, column: 1, rule: "trailing-spaces", level: "error", message: "msg" },
    ];
    const map = new Map<number, Set<string> | null>([[1, null]]);
    const result = filterProblems(problems, map, false);
    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(2);
  });
});
