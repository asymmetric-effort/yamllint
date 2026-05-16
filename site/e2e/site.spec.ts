import { test, expect } from "@playwright/test";

test.describe("site deployment verification", () => {
  test("favicon.ico is served and returns valid response", async ({ request }) => {
    const response = await request.get("/favicon.ico");
    expect(response.status()).toBe(200);
    const body = await response.body();
    expect(body.length).toBeGreaterThan(0);
  });

  test("favicon-32.png is served", async ({ request }) => {
    const response = await request.get("/favicon-32.png");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("png");
  });

  test("favicon-16.png is served", async ({ request }) => {
    const response = await request.get("/favicon-16.png");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("png");
  });

  test("apple-touch-icon.png is served", async ({ request }) => {
    const response = await request.get("/apple-touch-icon.png");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("png");
  });

  test("logo.png is served", async ({ request }) => {
    const response = await request.get("/logo.png");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("png");
  });

  test("HTML contains favicon link tags", async ({ page }) => {
    await page.goto("/");
    const icoLink = page.locator('link[rel="icon"][href="/favicon.ico"]');
    await expect(icoLink).toHaveCount(1);

    const png32Link = page.locator('link[rel="icon"][sizes="32x32"]');
    await expect(png32Link).toHaveCount(1);

    const png16Link = page.locator('link[rel="icon"][sizes="16x16"]');
    await expect(png16Link).toHaveCount(1);

    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleIcon).toHaveCount(1);
  });

  test("home page renders with correct structure", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".nav-brand")).toContainText("yamllint");
    await expect(page.locator(".hero h1")).toContainText("yamllint");
    await expect(page.locator(".hero-badges")).toBeVisible();
    await expect(page.locator(".footer-inner")).toBeVisible();
  });

  test("navigation works", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="#/cli"]');
    await expect(page.locator(".main")).toContainText("CLI Reference");

    await page.click('a[href="#/api"]');
    await expect(page.locator(".main")).toContainText("API Reference");

    await page.click('a[href="#/validator"]');
    await expect(page.locator(".main")).toContainText("YAML Validator");
  });
});
