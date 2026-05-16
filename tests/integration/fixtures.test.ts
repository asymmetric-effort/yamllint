import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { lint } from "../../src/linter.js";
import { loadConfig } from "../../src/config.js";

const FIXTURES_DIR = join(import.meta.dirname, "../fixtures");
const PASSES_DIR = join(FIXTURES_DIR, "passes");
const FAILS_DIR = join(FIXTURES_DIR, "fails");

function getFixtures(dir: string): string[] {
  return readdirSync(dir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
}

describe("passing fixtures", () => {
  const fixtures = getFixtures(PASSES_DIR);

  for (const fixture of fixtures) {
    it(`should pass: ${fixture}`, () => {
      const source = readFileSync(join(PASSES_DIR, fixture), "utf-8");
      const { resolved } = loadConfig();
      const result = lint(source, resolved);
      const errors = result.problems.filter((p) => p.level === "error");
      expect(errors).toHaveLength(0);
    });
  }
});

describe("failing fixtures", () => {
  const fixtures = getFixtures(FAILS_DIR);

  for (const fixture of fixtures) {
    it(`should report problems: ${fixture}`, () => {
      const source = readFileSync(join(FAILS_DIR, fixture), "utf-8");
      const { resolved } = loadConfig();
      const result = lint(source, resolved);
      expect(result.problems.length).toBeGreaterThan(0);
    });
  }
});
