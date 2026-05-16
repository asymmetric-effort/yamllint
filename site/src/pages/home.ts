export function homePage(): string {
  const features = [
    ["24 Configurable Rules", "Comprehensive checks for formatting, style, and correctness across all YAML patterns"],
    ["Zero Dependencies", "Secure supply chain with no third-party runtime dependencies"],
    ["Multiple Output Formats", "Standard, parsable, colored, and GitHub Actions annotation formats"],
    ["Comment Directives", "Inline suppression with disable-line, block disable/enable, and disable-file"],
    ["Built-in Presets", "Default (strict) and relaxed configurations out of the box"],
    ["TypeScript API", "Full programmatic interface with complete type definitions"],
    ["CI/CD Ready", "Strict mode, parsable output, and GitHub Actions integration built in"],
  ];

  const featuresRows = features
    .map(([name, desc]) => `<tr><td>${name}</td><td>${desc}</td></tr>`)
    .join("");

  return `
    <div class="hero">
      <img src="/logo.png" alt="yamllint logo">
      <h1>@asymmetric-effort/yamllint</h1>
      <p>A zero-dependency YAML parser, linter, and validator with detailed error reporting.</p>
      <div class="badges">
        <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="zero dependencies">
        <img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript">
        <img src="https://img.shields.io/npm/l/@asymmetric-effort/yamllint" alt="MIT License">
      </div>
    </div>

    <div class="section">
      <h2>Installation</h2>
      <pre><code>npm install @asymmetric-effort/yamllint</code></pre>
      <p>Or install globally for command-line access:</p>
      <pre><code>npm install -g @asymmetric-effort/yamllint</code></pre>
    </div>

    <div class="section">
      <h2>Quick Start</h2>
      <h3>CLI</h3>
      <pre><code># Lint a file
yamllint myfile.yaml

# Lint a directory
yamllint ./config/

# Parsable output for CI
yamllint -f parsable --strict .

# Custom configuration
yamllint -d "extends: relaxed" .</code></pre>

      <h3>Module</h3>
      <pre><code>import { lint, loadConfig } from "@asymmetric-effort/yamllint";

const source = "---\\nkey: value\\n";
const { resolved } = loadConfig(undefined, "extends: default");
const result = lint(source, resolved);

for (const problem of result.problems) {
  console.log(\`\${problem.line}:\${problem.column} [\${problem.level}] \${problem.message}\`);
}</code></pre>
    </div>

    <div class="section">
      <h2>Features</h2>
      <table>
        <thead><tr><th>Feature</th><th>Description</th></tr></thead>
        <tbody>${featuresRows}</tbody>
      </table>
    </div>
  `;
}
