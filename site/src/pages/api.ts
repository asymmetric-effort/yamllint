export function ApiPage(): string {
  const exports = [
    ["lint(source, rules)", "Lint a YAML string against resolved rules, returning problems"],
    ["loadConfig(file?, data?)", "Load and resolve a yamllint configuration"],
    ["resolveConfig(config)", "Resolve a raw config into rule configurations"],
    ["tokenize(source)", "Tokenize YAML source into a token stream"],
    ["formatProblems(problems, opts)", "Format lint problems into a string output"],
    ["hasErrors(problems)", "Returns true if any problem is level error"],
    ["hasWarnings(problems)", "Returns true if any problem is level warning"],
    ["getAllRuleIds()", "Get the list of all supported rule IDs"],
    ["VERSION", "Current yamllint version string"],
  ];

  const exportsRows = exports
    .map(([name, desc]) => `<tr><td><code>${name}</code></td><td>${desc}</td></tr>`)
    .join("");

  return `
    <div class="section">
      <h2>API Reference</h2>
      <pre><code>import { lint, loadConfig, formatProblems } from "@asymmetric-effort/yamllint";</code></pre>
      <p>The module exposes a programmatic interface for linting YAML from Node.js or any JavaScript runtime.</p>
    </div>
    <div class="section">
      <h2>Exports</h2>
      <table>
        <thead><tr><th>Export</th><th>Description</th></tr></thead>
        <tbody>${exportsRows}</tbody>
      </table>
    </div>
    <div class="section">
      <h2>Usage Examples</h2>
      <h3>Basic Linting</h3>
      <pre><code>import { lint, loadConfig } from "@asymmetric-effort/yamllint";

const source = "---\\nkey: value\\n";
const { resolved } = loadConfig(undefined, "extends: default");
const result = lint(source, resolved);

console.log(result.problems);
// [{ line, column, rule, level, message }]</code></pre>
      <h3>Custom Configuration</h3>
      <pre><code>import { lint, loadConfig } from "@asymmetric-effort/yamllint";

const config = \`
extends: default
rules:
  line-length:
    max: 120
  document-start: disable
\`;

const { resolved } = loadConfig(undefined, config);
const result = lint(yamlSource, resolved);</code></pre>
      <h3>Formatting Output</h3>
      <pre><code>import { lint, loadConfig, formatProblems } from "@asymmetric-effort/yamllint";

const { resolved } = loadConfig();
const result = lint(source, resolved);

const output = formatProblems(result.problems, {
  format: "parsable",
  filename: "config.yaml",
  noWarnings: false,
});
// config.yaml:3:81: [error] line too long (89 > 80) (line-length)</code></pre>
    </div>`;
}
