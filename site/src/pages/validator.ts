export function validatorPage(): string {
  const sampleYaml = `---
name: yamllint
version: "1.0.0"
keywords:
  - yaml
  - lint
  - validator`;

  return `
    <div class="section">
      <h2>YAML Validator</h2>
      <p>Paste YAML below to check for common issues.</p>
    </div>

    <div class="validator">
      <textarea id="yaml-input" spellcheck="false" rows="12">${sampleYaml}</textarea>
      <div class="actions">
        <button id="btn-validate" class="btn btn-primary">Validate</button>
        <button id="btn-clear" class="btn">Clear</button>
      </div>
      <div id="result" class="result"></div>
    </div>
  `;
}
