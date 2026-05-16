import { describe, it, expect } from "vitest";
import { spawnSync } from "child_process";
import { join } from "path";

const CLI_PATH = join(import.meta.dirname, "../../src/bin.ts");
const FIXTURES_DIR = join(import.meta.dirname, "../fixtures");

function run(
  args: string[],
  options?: { input?: string },
): { stdout: string; stderr: string; status: number } {
  const result = spawnSync("npx", ["tsx", CLI_PATH, ...args], {
    encoding: "utf-8",
    input: options?.input,
    cwd: process.cwd(),
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status ?? 1,
  };
}

describe("CLI", () => {
  it("shows version with --version", () => {
    const { stdout, status } = run(["--version"]);
    expect(status).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("shows help with --help", () => {
    const { stdout, status } = run(["--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("--config-file");
    expect(stdout).toContain("--format");
  });

  it("lints a passing file with exit 0", () => {
    const { status } = run([
      join(FIXTURES_DIR, "passes/simple.yaml"),
      "-d",
      "extends: default",
    ]);
    expect(status).toBe(0);
  });

  it("lints a failing file with exit 1", () => {
    const { status } = run([
      join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
      "-d",
      "extends: default",
    ]);
    expect(status).toBe(1);
  });

  it("supports --format parsable", () => {
    const { stdout } = run([
      join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
      "-d",
      "extends: default",
      "-f",
      "parsable",
    ]);
    expect(stdout).toMatch(/\.yaml:\d+:\d+: \[/);
  });

  it("supports --format github", () => {
    const { stdout } = run([
      join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
      "-d",
      "extends: default",
      "-f",
      "github",
    ]);
    expect(stdout).toContain("::");
  });

  it("supports --strict flag (exit 2 for warnings only)", () => {
    const config = [
      "extends: default",
      "rules:",
      "  document-start:",
      "    present: true",
      "    level: warning",
      "  trailing-spaces: disable",
      "  new-line-at-end-of-file: disable",
      "  line-length: disable",
      "  empty-lines: disable",
      "  new-lines: disable",
      "  comments: disable",
      "  comments-indentation: disable",
      "  truthy: disable",
    ].join("\n");
    const { status } = run([
      join(FIXTURES_DIR, "fails/no-document-start.yaml"),
      "-d",
      config,
      "--strict",
    ]);
    expect(status).toBe(2);
  });

  it("supports --no-warnings flag", () => {
    const { stdout } = run([
      join(FIXTURES_DIR, "fails/truthy.yaml"),
      "-d",
      "extends: default",
      "--no-warnings",
      "-f",
      "parsable",
    ]);
    expect(stdout).not.toContain("[warning]");
  });

  it("reads from stdin with -", () => {
    const { stdout, status } = run(["-", "-d", "extends: default", "-f", "parsable"], {
      input: "---\nkey: value   \n",
    });
    expect(status).toBe(1);
    expect(stdout).toContain("trailing-spaces");
  });

  it("supports -d config-data option", () => {
    const config = [
      "extends: default",
      "rules:",
      "  trailing-spaces: disable",
      "  new-line-at-end-of-file: disable",
      "  line-length: disable",
      "  empty-lines: disable",
      "  document-start: disable",
      "  truthy: disable",
      "  comments: disable",
      "  comments-indentation: disable",
      "  new-lines: disable",
    ].join("\n");
    const { status } = run([
      join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
      "-d",
      config,
    ]);
    expect(status).toBe(0);
  });

  it("lists files with --list-files", () => {
    const { stdout, status } = run([
      join(FIXTURES_DIR, "passes"),
      "--list-files",
      "-d",
      "extends: default",
    ]);
    expect(status).toBe(0);
    expect(stdout).toContain(".yaml");
  });
});
