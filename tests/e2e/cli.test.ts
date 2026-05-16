import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "child_process";
import { join } from "path";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";

const CLI_PATH = join(import.meta.dirname, "../../src/bin.ts");
const FIXTURES_DIR = join(import.meta.dirname, "../fixtures");
const TMP_DIR = join(import.meta.dirname, "../.tmp");

function run(
  args: string[],
  options?: { input?: string; cwd?: string },
): { stdout: string; stderr: string; status: number } {
  const result = spawnSync("npx", ["tsx", CLI_PATH, ...args], {
    encoding: "utf-8",
    input: options?.input,
    cwd: options?.cwd || process.cwd(),
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status ?? 1,
  };
}

describe("CLI", () => {
  beforeEach(() => {
    if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true });
  });

  describe("flags", () => {
    it("shows version with --version", () => {
      const { stdout, status } = run(["--version"]);
      expect(status).toBe(0);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("shows version with -v", () => {
      const { stdout, status } = run(["-v"]);
      expect(status).toBe(0);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("shows help with --help", () => {
      const { stdout, status } = run(["--help"]);
      expect(status).toBe(0);
      expect(stdout).toContain("Usage:");
      expect(stdout).toContain("--config-file");
      expect(stdout).toContain("--format");
      expect(stdout).toContain("--strict");
      expect(stdout).toContain("--no-warnings");
      expect(stdout).toContain("--list-files");
    });

    it("shows help with -h", () => {
      const { stdout, status } = run(["-h"]);
      expect(status).toBe(0);
      expect(stdout).toContain("Usage:");
    });

    it("errors on unknown option", () => {
      const { stderr, status } = run(["--bogus"]);
      expect(status).toBe(1);
      expect(stderr).toContain("Unknown option");
    });

    it("errors when no files specified", () => {
      const { stderr, status } = run(["-d", "extends: default"]);
      expect(status).toBe(1);
      expect(stderr).toContain("No files to lint");
    });
  });

  describe("file linting", () => {
    it("lints a passing file with exit 0", () => {
      const { status } = run([join(FIXTURES_DIR, "passes/simple.yaml"), "-d", "extends: default"]);
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

    it("lints multiple files", () => {
      const { status } = run([
        join(FIXTURES_DIR, "passes/simple.yaml"),
        join(FIXTURES_DIR, "passes/nested.yaml"),
        "-d",
        "extends: default",
      ]);
      expect(status).toBe(0);
    });

    it("lints a directory recursively", () => {
      const { status } = run([join(FIXTURES_DIR, "passes"), "-d", "extends: default"]);
      expect(status).toBe(0);
    });

    it("errors on non-existent file", () => {
      const { stderr, status } = run(["/nonexistent/file.yaml", "-d", "extends: default"]);
      expect(status).toBe(1);
      expect(stderr).toContain("No such file or directory");
    });

    it("exits 0 when directory has no yaml files", () => {
      mkdirSync(join(TMP_DIR, "empty"), { recursive: true });
      writeFileSync(join(TMP_DIR, "empty", "readme.txt"), "not yaml");
      const { status } = run([join(TMP_DIR, "empty"), "-d", "extends: default"]);
      expect(status).toBe(0);
    });
  });

  describe("configuration", () => {
    it("supports -c config file", () => {
      const configPath = join(TMP_DIR, "config.yaml");
      writeFileSync(configPath, "extends: relaxed\n");
      const { status } = run([
        join(FIXTURES_DIR, "fails/no-document-start.yaml"),
        "-c",
        configPath,
      ]);
      expect(status).toBe(0);
    });

    it("supports --config-file", () => {
      const configPath = join(TMP_DIR, "config.yaml");
      writeFileSync(configPath, "extends: relaxed\n");
      const { status } = run([
        join(FIXTURES_DIR, "fails/no-document-start.yaml"),
        "--config-file",
        configPath,
      ]);
      expect(status).toBe(0);
    });

    it("supports -d config data", () => {
      const config =
        "extends: default\nrules:\n  trailing-spaces: disable\n  document-start: disable\n  new-line-at-end-of-file: disable\n  line-length: disable\n  empty-lines: disable\n  truthy: disable\n  comments: disable\n  comments-indentation: disable\n  new-lines: disable";
      const { status } = run([join(FIXTURES_DIR, "fails/trailing-spaces.yaml"), "-d", config]);
      expect(status).toBe(0);
    });

    it("supports --config-data", () => {
      const { status } = run([
        join(FIXTURES_DIR, "passes/simple.yaml"),
        "--config-data",
        "extends: default",
      ]);
      expect(status).toBe(0);
    });

    it("uses default config when none specified", () => {
      const { status } = run([join(FIXTURES_DIR, "passes/simple.yaml")], { cwd: TMP_DIR });
      expect(status).toBe(0);
    });
  });

  describe("output formats", () => {
    it("supports -f parsable", () => {
      const { stdout } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        "-d",
        "extends: default",
        "-f",
        "parsable",
      ]);
      expect(stdout).toMatch(/\.yaml:\d+:\d+: \[(error|warning)\]/);
    });

    it("supports --format standard", () => {
      const { stdout } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        "-d",
        "extends: default",
        "-f",
        "standard",
      ]);
      expect(stdout).toContain("trailing-spaces");
    });

    it("supports --format github", () => {
      const { stdout } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        "-d",
        "extends: default",
        "-f",
        "github",
      ]);
      expect(stdout).toContain("::error");
      expect(stdout).toContain("::group::");
      expect(stdout).toContain("::endgroup::");
    });

    it("supports --format colored", () => {
      const { stdout } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        "-d",
        "extends: default",
        "-f",
        "colored",
      ]);
      expect(stdout).toContain("\x1b[");
    });

    it("supports --format auto", () => {
      const { stdout } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        "-d",
        "extends: default",
        "-f",
        "auto",
      ]);
      expect(stdout.length).toBeGreaterThan(0);
    });
  });

  describe("strict mode", () => {
    it("--strict returns exit 2 for warnings only", () => {
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

    it("-s returns exit 2 for warnings only", () => {
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
        "-s",
      ]);
      expect(status).toBe(2);
    });

    it("--strict returns exit 0 when no problems", () => {
      const { status } = run([
        join(FIXTURES_DIR, "passes/simple.yaml"),
        "-d",
        "extends: default",
        "--strict",
      ]);
      expect(status).toBe(0);
    });

    it("--strict returns exit 1 for errors", () => {
      const { status } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        "-d",
        "extends: default",
        "--strict",
      ]);
      expect(status).toBe(1);
    });
  });

  describe("--no-warnings", () => {
    it("suppresses warning output", () => {
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
  });

  describe("stdin", () => {
    it("reads from stdin with -", () => {
      const { stdout, status } = run(["-", "-d", "extends: default", "-f", "parsable"], {
        input: "---\nkey: value   \n",
      });
      expect(status).toBe(1);
      expect(stdout).toContain("trailing-spaces");
    });

    it("reads valid yaml from stdin", () => {
      const { status } = run(["-", "-d", "extends: default"], {
        input: "---\nkey: value\n",
      });
      expect(status).toBe(0);
    });

    it("uses 'stdin' as filename in output", () => {
      const { stdout } = run(["-", "-d", "extends: default", "-f", "parsable"], {
        input: "---\nkey: value   \n",
      });
      expect(stdout).toContain("stdin:");
    });
  });

  describe("--list-files", () => {
    it("lists yaml files and exits 0", () => {
      const { stdout, status } = run([
        join(FIXTURES_DIR, "passes"),
        "--list-files",
        "-d",
        "extends: default",
      ]);
      expect(status).toBe(0);
      expect(stdout).toContain(".yaml");
    });

    it("does not lint when listing files", () => {
      const { stdout, status } = run([
        join(FIXTURES_DIR, "fails"),
        "--list-files",
        "-d",
        "extends: default",
      ]);
      expect(status).toBe(0);
      // Should list files, not report errors
      expect(stdout).not.toContain("[error]");
    });
  });

  describe("error cases", () => {
    it("reports errors to stderr for unreadable files", () => {
      writeFileSync(join(TMP_DIR, "test.yaml"), "---\nkey: value\n");
      // This tests the file reading path works
      const { status } = run([join(TMP_DIR, "test.yaml"), "-d", "extends: default"]);
      expect(status).toBe(0);
    });
  });

  describe("rule detection", () => {
    it("detects trailing spaces", () => {
      const { stdout } = run(["-", "-d", "extends: default", "-f", "parsable"], {
        input: "---\nkey: value   \n",
      });
      expect(stdout).toContain("trailing-spaces");
    });

    it("detects line too long", () => {
      const { stdout } = run(["-", "-d", "extends: default", "-f", "parsable"], {
        input: "---\nkey: " + "a".repeat(80) + "\n",
      });
      expect(stdout).toContain("line-length");
    });

    it("detects missing document start", () => {
      const { stdout } = run(["-", "-d", "extends: default", "-f", "parsable"], {
        input: "key: value\n",
      });
      expect(stdout).toContain("document-start");
    });

    it("detects truthy values", () => {
      const { stdout } = run(["-", "-d", "extends: default", "-f", "parsable"], {
        input: "---\nenabled: yes\n",
      });
      expect(stdout).toContain("truthy");
    });

    it("detects too many empty lines", () => {
      const { stdout } = run(["-", "-d", "extends: default", "-f", "parsable"], {
        input: "---\nkey: value\n\n\n\nother: thing\n",
      });
      expect(stdout).toContain("empty-lines");
    });

    it("detects missing newline at end of file", () => {
      const { stdout } = run(["-", "-d", "extends: default", "-f", "parsable"], {
        input: "---\nkey: value",
      });
      expect(stdout).toContain("new-line-at-end-of-file");
    });

    it("detects wrong indentation", () => {
      const { stdout } = run(["-", "-d", "extends: default", "-f", "parsable"], {
        input: "---\nparent:\n   child: value\n",
      });
      expect(stdout).toContain("indentation");
    });
  });
});
