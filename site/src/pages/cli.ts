export function CliPage(): string {
  const options = [
    ["-h, --help", "Show help message and exit"],
    ["-v, --version", "Show version number and exit"],
    ["-c, --config-file FILE", "Path to a custom configuration file"],
    ["-d, --config-data DATA", "Custom configuration as inline YAML"],
    ["-f, --format FORMAT", "Output format: parsable, standard, colored, github, auto"],
    ["-s, --strict", "Return non-zero exit code on warnings"],
    ["--no-warnings", "Suppress warning-level output"],
    ["--list-files", "List files that would be linted and exit"],
    ["-", "Read YAML from standard input"],
  ];

  const optionsRows = options
    .map(([flag, desc]) => `<tr><td><code>${flag}</code></td><td>${desc}</td></tr>`)
    .join("");

  return `
    <div class="section">
      <h2>CLI Reference</h2>
      <pre><code>yamllint [OPTIONS] [FILE_OR_DIR...]</code></pre>
      <p>A linter for YAML files. Checks for syntax validity, cosmetic problems, and key duplication.</p>
    </div>
    <div class="section">
      <h2>Options</h2>
      <table>
        <thead><tr><th>Flag</th><th>Description</th></tr></thead>
        <tbody>${optionsRows}</tbody>
      </table>
    </div>
    <div class="section">
      <h2>Examples</h2>
      <h3>Lint a single file</h3>
      <pre><code>yamllint config.yaml</code></pre>
      <h3>Parsable output for editors</h3>
      <pre><code>yamllint -f parsable .
# config.yaml:3:81: [error] line too long (89 > 80) (line-length)
# config.yaml:7:1: [warning] missing document start "---" (document-start)</code></pre>
      <h3>Custom configuration inline</h3>
      <pre><code>yamllint -d "extends: default
rules:
  line-length:
    max: 120
  document-start: disable" .</code></pre>
      <h3>Strict mode for CI</h3>
      <pre><code>yamllint --strict -f parsable . || exit 1</code></pre>
    </div>
    <div class="section">
      <h2>Exit Codes</h2>
      <table>
        <thead><tr><th>Code</th><th>Normal Mode</th><th>Strict Mode</th></tr></thead>
        <tbody>
          <tr><td>0</td><td>No errors</td><td>No errors or warnings</td></tr>
          <tr><td>1</td><td>Errors found</td><td>Errors found</td></tr>
          <tr><td>2</td><td>\u2014</td><td>Warnings only</td></tr>
        </tbody>
      </table>
    </div>`;
}
