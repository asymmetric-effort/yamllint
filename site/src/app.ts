import { homePage } from "./pages/home.js";
import { cliPage } from "./pages/cli.js";
import { apiPage } from "./pages/api.js";
import { validatorPage } from "./pages/validator.js";

declare const __APP_VERSION__: string;

const routes: Record<string, () => string> = {
  "/": homePage,
  "/validator": validatorPage,
  "/cli": cliPage,
  "/api": apiPage,
};

function nav(currentPath: string): string {
  const links = [
    { href: "/", label: "Home" },
    { href: "/validator", label: "Validator" },
    { href: "/cli", label: "CLI" },
    { href: "/api", label: "API" },
  ];

  const navLinks = links
    .map((l) => {
      const active =
        l.href === "/"
          ? currentPath === "/"
          : currentPath.startsWith(l.href);
      return `<a href="#${l.href}" class="${active ? "active" : ""}">${l.label}</a>`;
    })
    .join("");

  return `<nav>
    <a href="#/" class="brand">
      <img src="/logo.png" alt="yamllint">
      yamllint
    </a>
    <div class="links">${navLinks}</div>
  </nav>`;
}

function footer(): string {
  return `<footer>
    <div class="links">
      <a href="https://github.com/asymmetric-effort/yamllint">GitHub</a>
      <a href="https://www.npmjs.com/package/@asymmetric-effort/yamllint">npm</a>
      <a href="https://github.com/asymmetric-effort/yamllint/blob/main/LICENSE.txt">MIT License</a>
    </div>
    <p>&copy; Asymmetric Effort, LLC &middot; v${__APP_VERSION__}</p>
  </footer>`;
}

function getPath(): string {
  const hash = window.location.hash.slice(1) || "/";
  return hash;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function render(): void {
  const path = getPath();
  const page = routes[path] || routes["/"];
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = nav(path) + `<main>${page()}</main>` + footer();

  // Bind validator interactions if on that page
  if (path === "/validator") {
    bindValidator();
  }

  updateHead(path);
}

function updateHead(path: string): void {
  const titles: Record<string, string> = {
    "/": "yamllint - YAML Linter & Validator",
    "/validator": "YAML Validator - yamllint",
    "/cli": "CLI Reference - yamllint",
    "/api": "API Reference - yamllint",
  };
  document.title = titles[path] || titles["/"];
}

function bindValidator(): void {
  const textarea = document.getElementById("yaml-input") as HTMLTextAreaElement | null;
  const resultDiv = document.getElementById("result") as HTMLDivElement | null;
  if (!textarea || !resultDiv) return;

  document.getElementById("btn-validate")?.addEventListener("click", () => {
    const input = textarea.value;
    if (!input.trim()) {
      showResult(resultDiv, "Please enter YAML to validate.", "error");
      return;
    }
    // Basic YAML validation check
    try {
      // Check for common YAML syntax errors
      const lines = input.split("\n");
      let hasError = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("\t")) {
          showResult(resultDiv, `Line ${i + 1}: tab character found (use spaces for indentation)`, "error");
          hasError = true;
          break;
        }
      }
      if (!hasError) {
        showResult(resultDiv, "Valid YAML - no issues found.", "success");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showResult(resultDiv, escapeHtml(msg), "error");
    }
  });

  document.getElementById("btn-clear")?.addEventListener("click", () => {
    textarea.value = "";
    resultDiv.className = "result";
    resultDiv.innerHTML = "";
  });
}

function showResult(el: HTMLDivElement, message: string, type: "success" | "error"): void {
  el.className = `result visible ${type}`;
  el.innerHTML = message;
}

window.addEventListener("hashchange", render);
render();
