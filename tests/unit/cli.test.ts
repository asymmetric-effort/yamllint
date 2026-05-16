import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  spyOn,
  mock,
} from "@asymmetric-effort/nogginlessdom";
import { join } from "path";

const FIXTURES_DIR = join(import.meta.dirname, "../fixtures");

// We test the CLI by importing main() and mocking process.exit/console
let exitCode: number | undefined;
let stdoutOutput: string[];
let stderrOutput: string[];

beforeEach(() => {
  exitCode = undefined;
  stdoutOutput = [];
  stderrOutput = [];
  spyOn(process, "exit").mockImplementation((code?: number) => {
    exitCode = code ?? 0;
    throw new Error(`EXIT_${code}`);
  });
  spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    stdoutOutput.push(args.map(String).join(" "));
  });
  spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    stderrOutput.push(args.map(String).join(" "));
  });
});

afterEach(() => {
  mock.restoreAllMocks();
});

async function runCli(args: string[]) {
  // Dynamic import to get fresh module state
  const { main } = await import("../../src/cli.js");
  try {
    main(args);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.startsWith("EXIT_")) {
      // expected
    } else {
      throw e;
    }
  }
  return {
    exitCode: exitCode ?? 0,
    stdout: stdoutOutput.join("\n"),
    stderr: stderrOutput.join("\n"),
  };
}

describe("CLI (in-process)", () => {
  it("--version prints version and exits 0", async () => {
    const { exitCode, stdout } = await runCli(["--version"]);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it("-v prints version", async () => {
    const { exitCode, stdout } = await runCli(["-v"]);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it("--help prints usage and exits 0", async () => {
    const { exitCode, stdout } = await runCli(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("--config-file");
    expect(stdout).toContain("--format");
    expect(stdout).toContain("--strict");
    expect(stdout).toContain("--no-warnings");
    expect(stdout).toContain("--list-files");
  });

  it("-h prints usage", async () => {
    const { exitCode, stdout } = await runCli(["-h"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
  });

  it("unknown flag prints error and exits 1", async () => {
    const { exitCode, stderr } = await runCli(["--unknown-flag"]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Unknown option");
  });

  it("no files prints error and exits 1", async () => {
    const { exitCode, stderr } = await runCli(["-d", "extends: default"]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("No files to lint");
  });

  it("non-existent file prints error and exits 1", async () => {
    const { exitCode, stderr } = await runCli(["/no/such/file.yaml", "-d", "extends: default"]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("No such file or directory");
  });

  it("lints passing file and exits 0", async () => {
    const { exitCode } = await runCli([
      join(FIXTURES_DIR, "passes/simple.yaml"),
      "-d",
      "extends: default",
    ]);
    expect(exitCode).toBe(0);
  });

  it("lints failing file and exits 1", async () => {
    const { exitCode, stdout } = await runCli([
      join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
      "-d",
      "extends: default",
      "-f",
      "parsable",
    ]);
    expect(exitCode).toBe(1);
    expect(stdout).toContain("trailing-spaces");
  });

  it("lints directory recursively", async () => {
    const { exitCode } = await runCli([join(FIXTURES_DIR, "passes"), "-d", "extends: default"]);
    expect(exitCode).toBe(0);
  });

  it("-f parsable outputs parsable format", async () => {
    const { stdout } = await runCli([
      join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
      "-d",
      "extends: default",
      "-f",
      "parsable",
    ]);
    expect(stdout).toMatch(/\.yaml:\d+:\d+: \[error\]/);
  });

  it("-f github outputs github annotations", async () => {
    const { stdout } = await runCli([
      join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
      "-d",
      "extends: default",
      "-f",
      "github",
    ]);
    expect(stdout).toContain("::error");
    expect(stdout).toContain("::group::");
  });

  it("-f colored outputs ANSI codes", async () => {
    const { stdout } = await runCli([
      join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
      "-d",
      "extends: default",
      "-f",
      "colored",
    ]);
    expect(stdout).toContain("\x1b[");
  });

  it("-f standard outputs standard format", async () => {
    const { stdout } = await runCli([
      join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
      "-d",
      "extends: default",
      "-f",
      "standard",
    ]);
    expect(stdout).toContain("error");
    expect(stdout).toContain("trailing");
  });

  it("--strict exits 2 for warnings only", async () => {
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
    const { exitCode } = await runCli([
      join(FIXTURES_DIR, "fails/no-document-start.yaml"),
      "-d",
      config,
      "--strict",
    ]);
    expect(exitCode).toBe(2);
  });

  it("--no-warnings suppresses warnings", async () => {
    const { stdout } = await runCli([
      join(FIXTURES_DIR, "fails/truthy.yaml"),
      "-d",
      "extends: default",
      "--no-warnings",
      "-f",
      "parsable",
    ]);
    expect(stdout).not.toContain("[warning]");
  });

  it("--list-files lists files without linting", async () => {
    const { exitCode, stdout } = await runCli([
      join(FIXTURES_DIR, "passes"),
      "--list-files",
      "-d",
      "extends: default",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain(".yaml");
    expect(stdout).not.toContain("[error]");
  });

  it("-c loads config from file", async () => {
    const { writeFileSync, mkdirSync, existsSync, rmSync } = await import("fs");
    const tmpDir = join(import.meta.dirname, "../.tmp-cli");
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    const configPath = join(tmpDir, "cfg.yaml");
    writeFileSync(configPath, "extends: relaxed\n");
    const { exitCode } = await runCli([
      join(FIXTURES_DIR, "fails/no-document-start.yaml"),
      "-c",
      configPath,
    ]);
    expect(exitCode).toBe(0);
    rmSync(tmpDir, { recursive: true });
  });

  it("multiple files with some failing exits 1", async () => {
    const { exitCode } = await runCli([
      join(FIXTURES_DIR, "passes/simple.yaml"),
      join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
      "-d",
      "extends: default",
    ]);
    expect(exitCode).toBe(1);
  });

  it("directory with no yaml files exits 0", async () => {
    const { mkdirSync, writeFileSync, existsSync, rmSync } = await import("fs");
    const tmpDir = join(import.meta.dirname, "../.tmp-empty");
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "readme.txt"), "not yaml");
    const { exitCode } = await runCli([tmpDir, "-d", "extends: default"]);
    expect(exitCode).toBe(0);
    rmSync(tmpDir, { recursive: true });
  });

  it("-f auto selects a format", async () => {
    const { exitCode, stdout } = await runCli([
      join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
      "-d",
      "extends: default",
      "-f",
      "auto",
    ]);
    expect(exitCode).toBe(1);
    expect(stdout.length).toBeGreaterThan(0);
  });

  it("--config-file with -c alias works", async () => {
    const { writeFileSync, mkdirSync, existsSync, rmSync } = await import("fs");
    const tmpDir = join(import.meta.dirname, "../.tmp-cli2");
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    const configPath = join(tmpDir, "cfg.yaml");
    writeFileSync(
      configPath,
      "extends: default\nrules:\n  line-length:\n    max: 200\n  document-start: disable\n  trailing-spaces: disable\n",
    );
    const { exitCode } = await runCli([
      join(FIXTURES_DIR, "fails/long-line.yaml"),
      "--config-file",
      configPath,
    ]);
    expect(exitCode).toBe(0);
    rmSync(tmpDir, { recursive: true });
  });

  it("prints separator between multiple file outputs", async () => {
    const { exitCode, stdout } = await runCli([
      join(FIXTURES_DIR, "fails/trailing-spaces.yaml"),
      join(FIXTURES_DIR, "fails/truthy.yaml"),
      "-d",
      "extends: default",
      "-f",
      "parsable",
    ]);
    expect(exitCode).toBe(1);
    // Both files should appear in output
    expect(stdout).toContain("trailing-spaces");
    expect(stdout).toContain("truthy");
  });
});
