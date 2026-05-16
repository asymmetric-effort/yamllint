import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { parse as parseYamlString } from "yaml";
import type { YamllintConfig, RuleConf, ResolvedRuleConfig, Severity } from "./types.js";
import { getAllRuleIds } from "./rules/index.js";

const DEFAULT_YAML_FILE_PATTERNS = ["*.yaml", "*.yml", ".yamllint"];

const DEFAULT_CONFIG: YamllintConfig = {
  extends: "default",
  rules: {},
};

const PRESET_DEFAULT: Record<string, { level: Severity; conf?: RuleConf }> = {
  anchors: {
    level: "error",
    conf: {
      "forbid-undeclared-aliases": true,
      "forbid-duplicated-anchors": false,
      "forbid-unused-anchors": false,
    },
  },
  braces: {
    level: "error",
    conf: {
      forbid: false,
      "min-spaces-inside": 0,
      "max-spaces-inside": 0,
      "min-spaces-inside-empty": -1,
      "max-spaces-inside-empty": -1,
    },
  },
  brackets: {
    level: "error",
    conf: {
      forbid: false,
      "min-spaces-inside": 0,
      "max-spaces-inside": 0,
      "min-spaces-inside-empty": -1,
      "max-spaces-inside-empty": -1,
    },
  },
  colons: { level: "error", conf: { "max-spaces-before": 0, "max-spaces-after": 1 } },
  commas: {
    level: "error",
    conf: { "max-spaces-before": 0, "min-spaces-after": 1, "max-spaces-after": 1 },
  },
  comments: {
    level: "warning",
    conf: { "require-starting-space": true, "ignore-shebangs": true, "min-spaces-from-content": 2 },
  },
  "comments-indentation": { level: "warning" },
  "document-end": { level: "error", conf: { present: false } },
  "document-start": { level: "warning", conf: { present: true } },
  "empty-lines": { level: "error", conf: { max: 2, "max-start": 0, "max-end": 0 } },
  "empty-values": {
    level: "error",
    conf: {
      "forbid-in-block-mappings": false,
      "forbid-in-flow-mappings": false,
      "forbid-in-block-sequences": false,
    },
  },
  "float-values": {
    level: "error",
    conf: { "forbid-scientific-notation": false, "forbid-nan": false, "forbid-inf": false },
  },
  hyphens: { level: "error", conf: { "max-spaces-after": 1 } },
  indentation: {
    level: "error",
    conf: { spaces: 2, "indent-sequences": true, "check-multi-line-strings": false },
  },
  "key-duplicates": { level: "error", conf: { "forbid-duplicated-merge-keys": false } },
  "key-ordering": { level: "error" },
  "line-length": {
    level: "error",
    conf: {
      max: 80,
      "allow-non-breakable-words": true,
      "allow-non-breakable-inline-mappings": false,
      "allow-uri": true,
    },
  },
  "new-line-at-end-of-file": { level: "error" },
  "new-lines": { level: "error", conf: { type: "unix" } },
  "octal-values": {
    level: "error",
    conf: { "forbid-implicit-octal": true, "forbid-explicit-octal": true },
  },
  "quoted-strings": {
    level: "error",
    conf: {
      "quote-type": "any",
      required: false,
      "extra-required": [],
      "extra-allowed": [],
      "allow-quoted-quotes": false,
    },
  },
  "trailing-spaces": { level: "error" },
  truthy: { level: "warning", conf: { "allowed-values": ["true", "false"], "check-keys": true } },
};

const DEFAULT_ENABLED_RULES: Record<string, boolean> = {
  anchors: true,
  braces: true,
  brackets: true,
  colons: true,
  commas: true,
  comments: true,
  "comments-indentation": true,
  "document-end": false,
  "document-start": true,
  "empty-lines": true,
  "empty-values": false,
  "float-values": false,
  hyphens: true,
  indentation: true,
  "key-duplicates": true,
  "key-ordering": false,
  "line-length": true,
  "new-line-at-end-of-file": true,
  "new-lines": true,
  "octal-values": false,
  "quoted-strings": false,
  "trailing-spaces": true,
  truthy: true,
};

const RELAXED_OVERRIDES: Record<string, { level?: Severity; enabled?: boolean }> = {
  braces: { level: "warning", enabled: true },
  brackets: { level: "warning", enabled: true },
  colons: { level: "warning", enabled: true },
  commas: { level: "warning", enabled: true },
  comments: { enabled: false },
  "comments-indentation": { enabled: false },
  "document-start": { enabled: false },
  "empty-lines": { level: "warning", enabled: true },
  hyphens: { level: "warning", enabled: true },
  indentation: { level: "warning", enabled: true },
  "line-length": { level: "warning", enabled: true },
  truthy: { enabled: false },
};

export function findConfigFile(startDir: string): string | null {
  const names = [".yamllint", ".yamllint.yaml", ".yamllint.yml"];
  let dir = startDir;

  while (true) {
    for (const name of names) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Check XDG config
  const xdgHome = process.env.XDG_CONFIG_HOME || join(process.env.HOME || "", ".config");
  const xdgConfig = join(xdgHome, "yamllint", "config");
  if (existsSync(xdgConfig)) {
    return xdgConfig;
  }

  // Check env var
  const envConfig = process.env.YAMLLINT_CONFIG_FILE;
  if (envConfig && existsSync(envConfig)) {
    return envConfig;
  }

  return null;
}

export function loadConfig(
  configFile?: string,
  configData?: string,
): { resolved: ResolvedRuleConfig[]; config: YamllintConfig } {
  let rawConfig: YamllintConfig;

  if (configData) {
    rawConfig = parseYamlString(configData) || {};
    rawConfig.rules = rawConfig.rules || {};
  } else if (configFile) {
    const content = readFileSync(configFile, "utf-8");
    rawConfig = parseYamlString(content) || {};
    rawConfig.rules = rawConfig.rules || {};
  } else {
    rawConfig = { ...DEFAULT_CONFIG };
  }

  return {
    resolved: resolveConfig(rawConfig),
    config: rawConfig,
  };
}

export function resolveConfig(config: YamllintConfig): ResolvedRuleConfig[] {
  const resolved: ResolvedRuleConfig[] = [];
  const preset = config.extends || "default";

  for (const ruleId of getAllRuleIds()) {
    let enabled = DEFAULT_ENABLED_RULES[ruleId] ?? false;
    let level: Severity = PRESET_DEFAULT[ruleId]?.level || "error";
    let conf: RuleConf = { ...(PRESET_DEFAULT[ruleId]?.conf || {}) };

    // Apply relaxed overrides if extending relaxed
    if (preset === "relaxed") {
      const relaxed = RELAXED_OVERRIDES[ruleId];
      if (relaxed) {
        if (relaxed.enabled !== undefined) enabled = relaxed.enabled;
        if (relaxed.level) level = relaxed.level;
      }
    }

    // Apply user overrides
    const userRule = config.rules[ruleId];
    if (userRule === "disable" || userRule === false) {
      continue;
    } else if (userRule === "enable") {
      enabled = true;
    } else if (userRule !== undefined && typeof userRule === "object") {
      enabled = true;
      if ("level" in userRule) {
        level = userRule.level as Severity;
      }
      // Merge user conf into defaults
      for (const [key, val] of Object.entries(userRule)) {
        if (key !== "level") {
          conf[key] = val;
        }
      }
    }

    if (enabled) {
      resolved.push({ id: ruleId, conf, level });
    }
  }

  return resolved;
}

export function getYamlFilePatterns(config: YamllintConfig): string[] {
  return config.yamlFiles || DEFAULT_YAML_FILE_PATTERNS;
}

export function getIgnorePatterns(config: YamllintConfig): string {
  if (config.ignoreFromFile && config.ignoreFromFile.length > 0) {
    return config.ignoreFromFile
      .map((f) => {
        try {
          return readFileSync(f, "utf-8");
        } catch {
          return "";
        }
      })
      .join("\n");
  }
  return config.ignore || "";
}
