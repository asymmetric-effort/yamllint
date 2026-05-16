import { describe, it, expect } from "@asymmetric-effort/nogginlessdom";
import { loadConfig, resolveConfig } from "../../src/config.js";

describe("loadConfig", () => {
  it("loads default config when no arguments provided", () => {
    const { resolved } = loadConfig();
    expect(resolved.length).toBeGreaterThan(0);
  });

  it("loads config from YAML string", () => {
    const { resolved } = loadConfig(undefined, "extends: default\nrules:\n  line-length: disable");
    const lineLength = resolved.find((r) => r.id === "line-length");
    expect(lineLength).toBeUndefined();
  });

  it("enables disabled rules via config", () => {
    const { resolved } = loadConfig(undefined, "extends: default\nrules:\n  key-ordering: enable");
    const keyOrdering = resolved.find((r) => r.id === "key-ordering");
    expect(keyOrdering).toBeDefined();
  });

  it("overrides rule options", () => {
    const { resolved } = loadConfig(
      undefined,
      "extends: default\nrules:\n  line-length:\n    max: 120",
    );
    const lineLength = resolved.find((r) => r.id === "line-length");
    expect(lineLength).toBeDefined();
    expect(lineLength!.conf.max).toBe(120);
  });

  it("supports severity level override", () => {
    const { resolved } = loadConfig(
      undefined,
      "extends: default\nrules:\n  line-length:\n    max: 80\n    level: warning",
    );
    const lineLength = resolved.find((r) => r.id === "line-length");
    expect(lineLength!.level).toBe("warning");
  });
});

describe("resolveConfig", () => {
  it("applies default preset", () => {
    const resolved = resolveConfig({ extends: "default", rules: {} });
    const trailing = resolved.find((r) => r.id === "trailing-spaces");
    expect(trailing).toBeDefined();
    expect(trailing!.level).toBe("error");
  });

  it("applies relaxed preset", () => {
    const resolved = resolveConfig({ extends: "relaxed", rules: {} });
    const comments = resolved.find((r) => r.id === "comments");
    expect(comments).toBeUndefined(); // disabled in relaxed
  });

  it("relaxed preset sets warnings for some rules", () => {
    const resolved = resolveConfig({ extends: "relaxed", rules: {} });
    const braces = resolved.find((r) => r.id === "braces");
    expect(braces).toBeDefined();
    expect(braces!.level).toBe("warning");
  });

  it("disables document-end by default", () => {
    const resolved = resolveConfig({ extends: "default", rules: {} });
    const docEnd = resolved.find((r) => r.id === "document-end");
    expect(docEnd).toBeUndefined();
  });
});
