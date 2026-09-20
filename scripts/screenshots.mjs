import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1050 },
  deviceScaleFactor: 1,
});
const errors = [];
await page.emulateMedia({reducedMotion:'reduce'});
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:3000");
await page
  .getByRole("heading", { name: "Make room for what matters." })
  .waitFor();
fs.mkdirSync("tmp/screenshots", { recursive: true });
await page.screenshot({
  path: "tmp/screenshots/dashboard-desktop.png",
  fullPage: true,
});
await page.getByRole("button", { name: "FR", exact: true }).click();
await page
  .getByRole("heading", { name: "Faites place à l’essentiel." })
  .waitFor();
await page.getByRole("button", { name: "Sombre", exact: true }).click();
await page.screenshot({
  path: "tmp/screenshots/dashboard-dark-fr.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Clair", exact: true }).click();
await page.getByRole("button", { name: "EN", exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: "tmp/screenshots/dashboard-mobile.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Open navigation" }).click();
await page.getByRole("link", { name: "Library", exact: true }).click();
await page.getByRole("heading", { name: "Library", exact: true }).waitFor();
if (
  await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
)
  throw new Error("Mobile horizontal overflow");
await page
  .getByRole("button", { name: "Add book", exact: true })
  .first()
  .click();
await page.getByRole("heading", { name: "Settings", exact: true }).waitFor();
await page.getByRole("heading", { name: "Database setup needed" }).waitFor();
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("dialog").waitFor();
await page.keyboard.press("Escape");
console.log(
  JSON.stringify(
    {
      browserErrors: errors,
      mobileOverflow: false,
      setupGuard: true,
      themeAndLocale: true,
    },
    null,
    2,
  ),
);
await browser.close();
