export function HomePage(): string {
  const features = [
    ["24 Configurable Rules", "Formatting, style, and correctness checks for all YAML patterns"],
    ["Detailed Errors", "Line/column tracking with rule identification"],
    ["Comment Directives", "Inline suppression with disable-line, disable/enable blocks"],
    ["Multiple Output Formats", "Standard, parsable, colored, and GitHub Actions annotations"],
    ["Built-in Presets", "Default (strict) and relaxed configurations out of the box"],
    ["CLI Tool", "Full-featured command-line interface with all standard flags"],
    ["Zero Dependencies", "No runtime dependencies \u2014 everything built from scratch"],
  ];

  const featureRows = features
    .map(([f, d]) => `<tr><td><strong>${f}</strong></td><td>${d}</td></tr>`)
    .join("");

  return `
    <div class="hero">
      <h1>@asymmetric-effort/yamllint</h1>
      <p>A zero-dependency YAML parser, linter, and validator with detailed error reporting. Feature-compatible with adrienverge/yamllint.</p>
      <div class="hero-badges">
        <span class="badge badge-primary">Zero Dependencies</span>
        <span class="badge">TypeScript</span>
        <span class="badge">MIT License</span>
        <span class="badge">24 Rules</span>
      </div>
    </div>
    <div class="section">
      <h2>Installation</h2>
      <pre><code>npm install @asymmetric-effort/yamllint</code></pre>
      <p>Or install globally for CLI usage:</p>
      <pre><code>npm install -g @asymmetric-effort/yamllint</code></pre>
    </div>
    <div class="section">
      <h2>Quick Start</h2>
      <h3>Module API</h3>
      <pre><code>import { lint, loadConfig } from "@asymmetric-effort/yamllint";

const source = "---\\nkey: value\\n";
const { resolved } = loadConfig(undefined, "extends: default");
const result = lint(source, resolved);
// Returns: { problems: [...] }</code></pre>
      <h3>CLI</h3>
      <pre><code># Lint a file
yamllint config.yaml

# Lint a directory recursively
yamllint ./ansible/

# Parsable output for CI
yamllint -f parsable --strict .</code></pre>
    </div>
    <div class="section">
      <h2>Features</h2>
      <table>
        <thead><tr><th>Feature</th><th>Description</th></tr></thead>
        <tbody>${featureRows}</tbody>
      </table>
    </div>`;
}
