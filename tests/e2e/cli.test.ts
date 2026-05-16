import { describe, it, expect, beforeEach, afterEach } from "@asymmetric-effort/nogginlessdom";
import { spawnSync } from "child_process";
import { join } from "path";
import { writeFileSync, mkdirSync, rmSync, existsSync, chmodSync } from "fs";

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

describe("CLI end-to-end via stdin/stdout/stderr", () => {
  beforeEach(() => {
    if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true });
  });

  // ========================================================================
  // Version and Help
  // ========================================================================
  describe("info flags", () => {
    it("--version prints semver to stdout, exits 0", () => {
      const { stdout, stderr, status } = run(["--version"]);
      expect(status).toBe(0);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
      expect(stderr).toBe("");
    });

    it("-v prints semver to stdout, exits 0", () => {
      const { stdout, status } = run(["-v"]);
      expect(status).toBe(0);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("--help prints usage to stdout, exits 0", () => {
      const { stdout, stderr, status } = run(["--help"]);
      expect(status).toBe(0);
      expect(stdout).toContain("Usage: yamllint");
      expect(stdout).toContain("-c, --config-file");
      expect(stdout).toContain("-d, --config-data");
      expect(stdout).toContain("-f, --format");
      expect(stdout).toContain("-s, --strict");
      expect(stdout).toContain("--no-warnings");
      expect(stdout).toContain("--list-files");
      expect(stderr).toBe("");
    });

    it("-h prints usage to stdout, exits 0", () => {
      const { stdout, status } = run(["-h"]);
      expect(status).toBe(0);
      expect(stdout).toContain("Usage:");
    });
  });

  // ========================================================================
  // Error conditions (stderr)
  // ========================================================================
  describe("error conditions", () => {
    it("unknown flag prints error to stderr, exits 1", () => {
      const { stdout, stderr, status } = run(["--bogus-flag"]);
      expect(status).toBe(1);
      expect(stderr).toContain("Unknown option: --bogus-flag");
      expect(stdout).toBe("");
    });

    it("no files or stdin prints error to stderr, exits 1", () => {
      const { stderr, status } = run(["-d", "extends: default"]);
      expect(status).toBe(1);
      expect(stderr).toContain("No files to lint");
    });

    it("nonexistent file prints error to stderr, exits 1", () => {
      const { stderr, status } = run(["/no/such/file.yaml", "-d", "extends: default"]);
      expect(status).toBe(1);
      expect(stderr).toContain("No such file or directory");
    });

    it("unreadable file prints error to stderr, exits 1", () => {
      const filePath = join(TMP_DIR, "unreadable.yaml");
      writeFileSync(filePath, "---\nkey: value\n");
      chmodSync(filePath, 0o000);
      const { stderr, status } = run([filePath, "-d", "extends: default"]);
      // Restore permissions for cleanup
      chmodSync(filePath, 0o644);
      expect(status).toBe(1);
      expect(stderr).toContain("Error");
    });
  });

  // ========================================================================
  // Stdin mode (the - flag)
  // ========================================================================
  describe("stdin mode", () => {
    it("reads valid YAML from stdin, exits 0", () => {
      const { stdout, stderr, status } = run(["-", "-d", "extends: default"], {
        input: "---\nkey: value\n",
      });
      expect(status).toBe(0);
      expect(stdout).toBe("");
      expect(stderr).toBe("");
    });

    it("reads invalid YAML from stdin, reports to stdout, exits 1", () => {
      const { stdout, status } = run(["-", "-d", "extends: default", "-f", "parsable"], {
        input: "---\nkey: value   \n",
      });
      expect(status).toBe(1);
      expect(stdout).toContain("stdin:");
      expect(stdout).toContain("trailing-spaces");
    });

    it("stdin with --strict exits 2 for warnings only", () => {
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
      const { status } = run(["-", "-d", config, "--strict"], {
        input: "key: value\n",
      });
      expect(status).toBe(2);
    });

    it("stdin with --no-warnings suppresses warnings", () => {
      const { stdout } = run(["-", "-d", "extends: default", "--no-warnings", "-f", "parsable"], {
        input: "---\nenabled: yes\n",
      });
      expect(stdout).not.toContain("[warning]");
    });

    it("stdin with -f github produces annotations", () => {
      const { stdout } = run(["-", "-d", "extends: default", "-f", "github"], {
        input: "---\nkey: value   \n",
      });
      expect(stdout).toContain("::error file=stdin");
    });

    it("stdin with -f colored produces ANSI codes", () => {
      const { stdout } = run(["-", "-d", "extends: default", "-f", "colored"], {
        input: "---\nkey: value   \n",
      });
      expect(stdout).toContain("\x1b[");
    });

    it("stdin with -f standard produces standard output", () => {
      const { stdout } = run(["-", "-d", "extends: default", "-f", "standard"], {
        input: "---\nkey: value   \n",
      });
      expect(stdout).toContain("stdin");
      expect(stdout).toContain("error");
    });

    it("stdin with clean YAML produces no output", () => {
      const { stdout, status } = run(["-", "-d", "extends: default"], {
        input: "---\nkey: value\n",
      });
      expect(status).toBe(0);
      expect(stdout).toBe("");
    });

    it("stdin detects multiple problems", () => {
      const { stdout, status } = run(["-", "-d", "extends: default", "-f", "parsable"], {
        input: "key: value   \n",
      });
      expect(status).toBe(1);
      // Should detect both trailing-spaces and document-start
      expect(stdout).toContain("trailing-spaces");
      expect(stdout).toContain("document-start");
    });
  });

  // ========================================================================
  // File linting
  // ========================================================================
  describe("file linting", () => {
    it("lints a passing file, exits 0, no stdout", () => {
      const { stdout, status } = run([
        join(FIXTURES_DIR, "passes/simple.yaml"),
        "-d",
        "extends: default",
      ]);
      expect(status).toBe(0);
      expect(stdout).toBe("");
    });

    it("lints a failing file, exits 1, problems to stdout", () => {
      const { stdout, status } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        "-d",
        "extends: default",
        "-f",
        "parsable",
      ]);
      expect(status).toBe(1);
      expect(stdout).toContain("[error]");
      expect(stdout).toContain("trailing-spaces");
    });

    it("lints multiple files, reports all problems", () => {
      const { stdout, status } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        join(FIXTURES_DIR, "fails/truthy.yaml"),
        "-d",
        "extends: default",
        "-f",
        "parsable",
      ]);
      expect(status).toBe(1);
      expect(stdout).toContain("trailing-spaces");
      expect(stdout).toContain("truthy");
    });

    it("lints a directory recursively", () => {
      const { status } = run([join(FIXTURES_DIR, "passes"), "-d", "extends: default"]);
      expect(status).toBe(0);
    });

    it("directory with no yaml files exits 0", () => {
      mkdirSync(join(TMP_DIR, "noyaml"), { recursive: true });
      writeFileSync(join(TMP_DIR, "noyaml", "readme.txt"), "not yaml");
      const { status } = run([join(TMP_DIR, "noyaml"), "-d", "extends: default"]);
      expect(status).toBe(0);
    });
  });

  // ========================================================================
  // Configuration
  // ========================================================================
  describe("configuration", () => {
    it("-c loads config from file", () => {
      const configPath = join(TMP_DIR, "custom.yaml");
      writeFileSync(configPath, "extends: relaxed\n");
      const { status } = run([
        join(FIXTURES_DIR, "fails/no-document-start.yaml"),
        "-c",
        configPath,
      ]);
      expect(status).toBe(0);
    });

    it("--config-file loads config from file", () => {
      const configPath = join(TMP_DIR, "custom2.yaml");
      writeFileSync(configPath, "extends: relaxed\n");
      const { status } = run([
        join(FIXTURES_DIR, "fails/no-document-start.yaml"),
        "--config-file",
        configPath,
      ]);
      expect(status).toBe(0);
    });

    it("-d provides inline config", () => {
      const config =
        "extends: default\nrules:\n  trailing-spaces: disable\n  document-start: disable\n  new-line-at-end-of-file: disable\n  line-length: disable\n  empty-lines: disable\n  truthy: disable\n  comments: disable\n  comments-indentation: disable\n  new-lines: disable";
      const { status } = run([join(FIXTURES_DIR, "fails/trailing-spaces.yaml"), "-d", config]);
      expect(status).toBe(0);
    });

    it("--config-data provides inline config", () => {
      const { status } = run([
        join(FIXTURES_DIR, "passes/simple.yaml"),
        "--config-data",
        "extends: default",
      ]);
      expect(status).toBe(0);
    });

    it("uses default config when no config specified", () => {
      const { status } = run([join(FIXTURES_DIR, "passes/simple.yaml")], { cwd: TMP_DIR });
      expect(status).toBe(0);
    });
  });

  // ========================================================================
  // Output formats
  // ========================================================================
  describe("output formats", () => {
    it("-f parsable produces file:line:col format", () => {
      const { stdout } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        "-d",
        "extends: default",
        "-f",
        "parsable",
      ]);
      expect(stdout).toMatch(/\.yaml:\d+:\d+: \[(error|warning)\]/);
    });

    it("-f standard produces filename header", () => {
      const { stdout } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        "-d",
        "extends: default",
        "-f",
        "standard",
      ]);
      expect(stdout).toContain("trailing-spaces");
    });

    it("-f github produces :: annotations", () => {
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

    it("-f colored produces ANSI escape sequences", () => {
      const { stdout } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        "-d",
        "extends: default",
        "-f",
        "colored",
      ]);
      expect(stdout).toContain("\x1b[31m"); // red for errors
    });

    it("--format auto works", () => {
      const { stdout, status } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        "-d",
        "extends: default",
        "--format",
        "auto",
      ]);
      expect(status).toBe(1);
      expect(stdout.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // Strict mode
  // ========================================================================
  describe("strict mode", () => {
    const warningOnlyConfig = [
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

    it("--strict exits 2 for warnings only", () => {
      const { status } = run([
        join(FIXTURES_DIR, "fails/no-document-start.yaml"),
        "-d",
        warningOnlyConfig,
        "--strict",
      ]);
      expect(status).toBe(2);
    });

    it("-s exits 2 for warnings only", () => {
      const { status } = run([
        join(FIXTURES_DIR, "fails/no-document-start.yaml"),
        "-d",
        warningOnlyConfig,
        "-s",
      ]);
      expect(status).toBe(2);
    });

    it("--strict exits 0 for clean file", () => {
      const { status } = run([
        join(FIXTURES_DIR, "passes/simple.yaml"),
        "-d",
        "extends: default",
        "--strict",
      ]);
      expect(status).toBe(0);
    });

    it("--strict exits 1 for errors", () => {
      const { status } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        "-d",
        "extends: default",
        "--strict",
      ]);
      expect(status).toBe(1);
    });
  });

  // ========================================================================
  // --no-warnings
  // ========================================================================
  describe("--no-warnings", () => {
    it("suppresses warning-level output in parsable format", () => {
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

    it("still shows errors", () => {
      const { stdout, status } = run([
        join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
        "-d",
        "extends: default",
        "--no-warnings",
        "-f",
        "parsable",
      ]);
      expect(status).toBe(1);
      expect(stdout).toContain("[error]");
    });
  });

  // ========================================================================
  // --list-files
  // ========================================================================
  describe("--list-files", () => {
    it("lists yaml files without linting, exits 0", () => {
      const { stdout, status } = run([
        join(FIXTURES_DIR, "passes"),
        "--list-files",
        "-d",
        "extends: default",
      ]);
      expect(status).toBe(0);
      expect(stdout).toContain(".yaml");
      expect(stdout).not.toContain("[error]");
      expect(stdout).not.toContain("[warning]");
    });

    it("lists files from failing directory without reporting errors", () => {
      const { stdout, status } = run([
        join(FIXTURES_DIR, "fails"),
        "--list-files",
        "-d",
        "extends: default",
      ]);
      expect(status).toBe(0);
      expect(stdout).toContain(".yaml");
    });
  });

  // ========================================================================
  // Rule-specific detection via stdin
  // ========================================================================
  describe("rule detection via stdin", () => {
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

    it("detects duplicate keys", () => {
      const { stdout } = run(["-", "-d", "extends: default", "-f", "parsable"], {
        input: "---\nname: first\nname: second\n",
      });
      expect(stdout).toContain("key-duplicates");
    });
  });
});
