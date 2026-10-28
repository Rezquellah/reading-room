import { test, expect } from "@playwright/test";

test("public pages lead to the study app and remain usable on mobile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Turn ideas",
  );
  await page
    .getByText("Do I need ChatGPT to use Reading Room?", { exact: true })
    .click();
  await expect(
    page.getByText("No. You can organize your reading", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Our story" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Their ideas shouldn’t",
  );
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Privacy",
  );
  await expect(
    page
      .getByRole("link", { name: "contact@rezquellah.com", exact: true })
      .first(),
  ).toHaveAttribute("href", "mailto:contact@rezquellah.com");
  await page.screenshot({
    path: "test-results/privacy-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Reading Room home" }).click();
  await page
    .getByRole("link", { name: "Start your reading room", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(
    "Your next chapter awaits.",
  );
  await expect(
    page.getByRole("button", { name: "Journal", exact: true }),
  ).toHaveCount(0);
  await page.goto("/?from=test");
  await page.getByRole("link", { name: "Already a reader? Sign in" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Welcome back");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/about", "/privacy"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/public-${path === "/" ? "home" : path.slice(1)}-mobile.png`,
      fullPage: true,
    });
  }
});
