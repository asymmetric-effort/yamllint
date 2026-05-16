import { HomePage } from "./pages/home.js";
import { ApiPage } from "./pages/api.js";
import { CliPage } from "./pages/cli.js";
import { ValidatorPage } from "./pages/validator.js";

declare const __APP_VERSION__: string;
const VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";

type PageComponent = () => string;

const ROUTES: Record<string, PageComponent> = Object.create(null);
ROUTES["/"] = HomePage;
ROUTES["/validator"] = ValidatorPage;
ROUTES["/cli"] = CliPage;
ROUTES["/api"] = ApiPage;

function getPath(): string {
  const hash = window.location.hash.replace(/^#\/?/, "/");
  return hash === "" ? "/" : hash;
}

function renderNav(currentPath: string): string {
  const links = [
    { to: "/", label: "Home", exact: true },
    { to: "/validator", label: "Validator" },
    { to: "/cli", label: "CLI" },
    { to: "/api", label: "API" },
  ];

  const navLinks = links
    .map((link) => {
      const isActive = link.exact ? currentPath === link.to : currentPath.startsWith(link.to);
      return `<a href="#${link.to}" class="${isActive ? "active" : ""}">${link.label}</a>`;
    })
    .join("");

  return `<nav class="nav">
    <a href="#/" class="nav-brand">yamllint</a>
    <div class="nav-links">${navLinks}</div>
  </nav>`;
}

function renderFooter(): string {
  return `<footer class="footer" role="contentinfo">
    <div class="footer-inner">
      <span>v${VERSION}</span>
      <span>MIT License \u00A9 2026 Asymmetric Effort, LLC</span>
      <span>
        <a href="https://github.com/asymmetric-effort/yamllint" target="_blank" rel="noopener noreferrer">GitHub</a>
        \u00B7
        <a href="https://github.com/asymmetric-effort/yamllint/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer">Security</a>
        \u00B7
        <a href="https://github.com/asymmetric-effort/yamllint/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">Contributing</a>
      </span>
    </div>
  </footer>`;
}

function render(): void {
  const path = getPath();
  const root = document.getElementById("root")!;
  const page = path in ROUTES ? ROUTES[path] : ROUTES["/"];

  root.innerHTML = `
    ${renderNav(path)}
    <main class="main">${page()}</main>
    ${renderFooter()}
  `;

  if (path === "/validator") {
    bindValidatorEvents();
  }

  updateHead(path);
}

function updateHead(path: string): void {
  const titles: Record<string, string> = Object.create(null);
  titles["/"] = "yamllint \u2014 YAML Linter & Validator";
  titles["/validator"] = "YAML Validator \u2014 yamllint";
  titles["/cli"] = "CLI Reference \u2014 yamllint";
  titles["/api"] = "API Reference \u2014 yamllint";

  document.title = path in titles ? titles[path] : titles["/"];

  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `https://yamllint.asymmetric-effort.com/${path === "/" ? "" : "#" + path}`;
}

function bindValidatorEvents(): void {
  const input = document.getElementById("yaml-input") as HTMLTextAreaElement;
  const resultDiv = document.getElementById("result-container")!;

  document.getElementById("btn-validate")?.addEventListener("click", () => {
    const value = input.value.trim();
    if (!value) {
      resultDiv.innerHTML = `<div class="result result-error">Please enter YAML to validate.</div>`;
      return;
    }
    const errors: string[] = [];
    const lines = value.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("\t")) {
        errors.push(`Line ${i + 1}: tab character found (use spaces for indentation)`);
      }
      if (lines[i] !== lines[i].trimEnd()) {
        errors.push(`Line ${i + 1}: trailing spaces`);
      }
    }
    if (errors.length > 0) {
      resultDiv.innerHTML = `<div class="result result-error">${escapeHtml(errors.join("\n"))}</div>`;
    } else {
      resultDiv.innerHTML = `<div class="result result-success">Valid YAML \u2014 no issues found.</div>`;
    }
  });

  document.getElementById("btn-clear")?.addEventListener("click", () => {
    input.value = "";
    resultDiv.innerHTML = "";
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

render();
window.addEventListener("hashchange", render);
