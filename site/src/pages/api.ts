export function apiPage(): string {
  const exports = [
    ["lint(source, rules)", "Lint a YAML string against resolved rules, returning problems"],
    ["loadConfig(file?, data?)", "Load and resolve a yamllint configuration"],
    ["resolveConfig(config)", "Resolve a raw config into rule configurations"],
    ["tokenize(source)", "Tokenize YAML source into a token stream"],
    ["extractComments(source)", "Extract comment positions from YAML source"],
    ["getLines(source)", "Split source into line objects with endings"],
    ["formatProblems(problems, opts)", "Format lint problems into a string output"],
    ["parseDirectives(source)", "Parse yamllint comment directives from source"],
    ["getAllRuleIds()", "Get the list of all supported rule IDs"],
    ["VERSION", "Current yamllint version string"],
  ];

  const exportsRows = exports
    .map(([name, desc]) => `<tr><td>${name}</td><td>${desc}</td></tr>`)
    .join("");

  return `
    <div class="section">
      <h2>API Reference</h2>
      <p>Import from <code>@asymmetric-effort/yamllint</code>:</p>
      <pre><code>import { lint, loadConfig, formatProblems } from "@asymmetric-effort/yamllint";</code></pre>
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
// [{ line: 1, column: 1, rule: "...", level: "error", message: "..." }]</code></pre>

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
console.log(output);
// config.yaml:3:81: [error] line too long (89 > 80) (line-length)</code></pre>

      <h3>Checking Results</h3>
      <pre><code>import { lint, loadConfig, hasErrors, hasWarnings } from "@asymmetric-effort/yamllint";

const { resolved } = loadConfig();
const result = lint(source, resolved);

if (hasErrors(result.problems)) {
  process.exit(1);
}
if (hasWarnings(result.problems)) {
  console.warn("Warnings found");
}</code></pre>
    </div>
  `;
}
