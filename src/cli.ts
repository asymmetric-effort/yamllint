import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, relative, extname, basename } from "path";
import { VERSION } from "./version.js";
import { findConfigFile, loadConfig, getYamlFilePatterns, getIgnorePatterns } from "./config.js";
import { lint } from "./linter.js";
import { formatProblems, hasErrors, hasWarnings } from "./formatter.js";
import type { OutputFormat, LintProblem } from "./types.js";
import { minimatch } from "./minimatch.js";

interface CliOptions {
  configFile?: string;
  configData?: string;
  format: OutputFormat;
  strict: boolean;
  noWarnings: boolean;
  listFiles: boolean;
  files: string[];
  stdin: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    format: "auto",
    strict: false,
    noWarnings: false,
    listFiles: false,
    files: [],
    stdin: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-v":
      case "--version":
        console.log(VERSION);
        process.exit(0);
        break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
        break;
      case "-c":
      case "--config-file":
        options.configFile = args[++i];
        break;
      case "-d":
      case "--config-data":
        options.configData = args[++i];
        break;
      case "-f":
      case "--format":
        options.format = args[++i] as OutputFormat;
        break;
      case "-s":
      case "--strict":
        options.strict = true;
        break;
      case "--no-warnings":
        options.noWarnings = true;
        break;
      case "--list-files":
        options.listFiles = true;
        break;
      case "-":
        options.stdin = true;
        break;
      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        options.files.push(arg);
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`Usage: yamllint [options] [FILE_OR_DIR...]

A linter for YAML files.

Options:
  -h, --help            Show this help message
  -v, --version         Show version number
  -c, --config-file F   Path to a custom configuration file
  -d, --config-data D   Custom configuration (as YAML source)
  -f, --format FORMAT   Output format (parsable, standard, colored, github, auto)
  -s, --strict          Return non-zero exit code on warnings
  --no-warnings         Output only error level problems
  --list-files          List files to lint and exit
  -                     Read YAML from stdin`);
}

function collectFiles(
  paths: string[],
  yamlPatterns: string[],
  ignorePattern: string,
): string[] {
  const files: string[] = [];
  const ignoreLines = ignorePattern
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  for (const p of paths) {
    const resolved = resolve(p);
    try {
      const stat = statSync(resolved);
      if (stat.isFile()) {
        files.push(resolved);
      } else if (stat.isDirectory()) {
        walkDirectory(resolved, yamlPatterns, ignoreLines, files);
      }
    } catch {
      console.error(`Error: No such file or directory: ${p}`);
      process.exit(1);
    }
  }

  return files;
}

function walkDirectory(
  dir: string,
  yamlPatterns: string[],
  ignoreLines: string[],
  files: string[],
): void {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);

    if (entry.name.startsWith(".") && entry.name !== ".yamllint") continue;
    if (entry.name === "node_modules") continue;

    if (isIgnored(fullPath, ignoreLines)) continue;

    if (entry.isDirectory()) {
      walkDirectory(fullPath, yamlPatterns, ignoreLines, files);
    } else if (entry.isFile()) {
      if (matchesYamlPattern(entry.name, yamlPatterns)) {
        files.push(fullPath);
      }
    }
  }
}

function matchesYamlPattern(filename: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (minimatch(filename, pattern)) return true;
  }
  return false;
}

function isIgnored(filepath: string, ignoreLines: string[]): boolean {
  const rel = relative(process.cwd(), filepath);
  for (const pattern of ignoreLines) {
    if (minimatch(rel, pattern) || minimatch(basename(filepath), pattern)) {
      return true;
    }
  }
  return false;
}

export function main(argv?: string[]): void {
  const args = argv || process.argv.slice(2);
  const options = parseArgs(args);

  // Load configuration
  let configFile = options.configFile;
  if (!configFile && !options.configData) {
    configFile = findConfigFile(process.cwd()) || undefined;
  }

  const { resolved: ruleConfigs, config } = loadConfig(configFile, options.configData);
  const yamlPatterns = getYamlFilePatterns(config);
  const ignorePattern = getIgnorePatterns(config);

  // Collect files
  if (options.stdin) {
    const source = readFileSync(0, "utf-8");
    const result = lint(source, ruleConfigs);
    const output = formatProblems(result.problems, {
      format: options.format,
      filename: "stdin",
      noWarnings: options.noWarnings,
    });
    if (output) console.log(output);
    process.exit(getExitCode(result.problems, options.strict));
    return;
  }

  if (options.files.length === 0) {
    console.error("Error: No files to lint. Specify files or directories.");
    process.exit(1);
  }

  const files = collectFiles(options.files, yamlPatterns, ignorePattern);

  if (options.listFiles) {
    for (const f of files) {
      console.log(relative(process.cwd(), f));
    }
    process.exit(0);
    return;
  }

  if (files.length === 0) {
    process.exit(0);
    return;
  }

  let allProblems: LintProblem[] = [];
  let hasOutput = false;

  for (const file of files) {
    try {
      const source = readFileSync(file, "utf-8");
      const result = lint(source, ruleConfigs);

      if (result.problems.length > 0) {
        const relPath = relative(process.cwd(), file);
        const output = formatProblems(result.problems, {
          format: options.format,
          filename: relPath,
          noWarnings: options.noWarnings,
        });
        if (output) {
          if (hasOutput) console.log("");
          console.log(output);
          hasOutput = true;
        }
      }

      allProblems = allProblems.concat(result.problems);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Error reading ${file}: ${msg}`);
      process.exit(1);
    }
  }

  process.exit(getExitCode(allProblems, options.strict));
}

function getExitCode(problems: LintProblem[], strict: boolean): number {
  if (hasErrors(problems)) return 1;
  if (strict && hasWarnings(problems)) return 2;
  return 0;
}
