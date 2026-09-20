import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PDFParse } from "pdf-parse";
import { readFileSync } from "node:fs";
test("learning journey persists through the real APIs, exports, and failed saves", async ({
  page,
  context,
}) => {
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "reader@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const jwt = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: user.id,
        exp: Math.floor(Date.now() / 1000) + 86400,
        aud: "authenticated",
        role: "authenticated",
      }),
    ).toString("base64url"),
    "test-signature",
  ].join(".");
  const session = {
    access_token: jwt,
    refresh_token: "test-refresh-token",
    token_type: "bearer",
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user,
  };
  await context.addCookies([
    {
      name: "sb-127-auth-token",
      value:
        "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Add book", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title *", { exact: true }).fill("Learning journal");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Learning journal/ }).click();
  await page
    .getByRole("button", { name: "Add chapter", exact: true })
    .first()
    .click();
  await dialog
    .getByLabel("Title *", { exact: true })
    .fill("Listening carefully");
  await dialog
    .getByRole("textbox", { name: "Quick paste", exact: true })
    .fill("A saved explanation. Écouter, réfléchir et apprendre.");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: /Listening carefully/ }).click();
  await expect(
    page.getByText("A saved explanation. Écouter, réfléchir et apprendre."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await dialog
    .getByRole("textbox", { name: "Quick paste", exact: true })
    .fill("UPDATED: écoute active et curiosité.");
  await page.route("**/api/records", async (route) => {
    if (route.request().method() === "POST")
      await route.fulfill({
        status: 503,
        json: { error: "Simulated network failure. Your input is preserved." },
      });
    else await route.continue();
  });
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Simulated network failure",
  );
  await expect(
    dialog.getByRole("textbox", { name: "Quick paste", exact: true }),
  ).toContainText("UPDATED");
  await page.unroute("**/api/records");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(
    page.getByText("UPDATED: écoute active et curiosité."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add vocabulary", exact: true })
    .click();
  await dialog.getByLabel("Word or expression *").fill("attentive");
  await dialog
    .getByRole("textbox", { name: "Definition", exact: true })
    .fill("Paying close attention.");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Vocabulary", exact: true }).click();
  await page.getByRole("button", { name: "attentive", exact: true }).click();
  await page
    .getByRole("button", { name: "Listening carefully", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Listening carefully", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create recall card", exact: true })
    .click();
  await dialog.getByLabel("Question / prompt *").fill("What helps me listen?");
  await dialog
    .getByRole("textbox", { name: "Reference answer", exact: true })
    .fill("Pause and ask a clarifying question.");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Review", exact: true }).click();
  await expect(
    page.getByText("Pause and ask a clarifying question."),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await page.getByRole("button", { name: "Good", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No reviews due right now" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "No reviews due right now" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "Add action", exact: true }).click();
  await dialog
    .getByLabel("What I want to try *")
    .fill("Ask one clarifying question");
  await dialog.getByLabel("Status", { exact: true }).selectOption("reflected");
  await dialog
    .getByRole("textbox", {
      name: "Personal experience: what happened",
      exact: true,
    })
    .fill("The conversation became clearer.");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: /Ask one clarifying question/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await page.getByRole("button", { name: "Add article", exact: true }).click();
  await dialog
    .getByLabel("Title *", { exact: true })
    .fill("La curiosité et l’écoute");
  await dialog.getByLabel("Language", { exact: true }).selectOption("fr");
  await dialog
    .getByRole("textbox", { name: "Main idea", exact: true })
    .fill("Comprendre avant de répondre.");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("textbox", { name: "Search your library…" })
    .fill("curiosite");
  await page.getByLabel("Language", { exact: true }).selectOption("fr");
  await expect(
    page.getByRole("button", { name: /La curiosité et l’écoute/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Learning journal/ }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: /La curiosité et l’écoute/ }).click();
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const pdfDownload = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Generate PDF" }).click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  await pdf.saveAs("tmp/pdfs/browser-article.pdf");
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await page.getByLabel("Language", { exact: true }).selectOption("all");
  await page.getByRole("button", { name: /Learning journal/ }).click();
  for (const title of ["Second chapter", "Third chapter"]) {
    await page
      .getByRole("button", { name: "Add chapter", exact: true })
      .click();
    await dialog.getByLabel("Title *", { exact: true }).fill(title);
    await dialog
      .getByRole("textbox", { name: "Quick paste", exact: true })
      .fill("Saved chapter text. ".repeat(120));
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
  }
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Third chapter/ }),
  ).toBeVisible();
  for (const kind of ["book", "chapter"]) {
    if (kind === "chapter")
      await page.getByRole("button", { name: /Listening carefully/ }).click();
    await page.getByRole("button", { name: "Export PDF", exact: true }).click();
    const pending = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Generate PDF" }).click();
    await (await pending).saveAs(`tmp/pdfs/browser-${kind}.pdf`);
  }
  await page.getByRole("link", { name: "Vocabulary", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select attentive" }).check();
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const vp = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Generate PDF" }).click();
  await (await vp).saveAs("tmp/pdfs/browser-vocabulary.pdf");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const backup = await backupDownload;
  await backup.saveAs("tmp/browser-backup.json");
  await page
    .locator("input[type=file]")
    .setInputFiles("tmp/browser-backup.json");
  await expect(dialog).toContainText("existing records will be skipped");
  await dialog
    .getByRole("button", { name: "Import backup", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("0 imported");
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    axe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({
    path: "tmp/screenshots/connected-mobile.png",
    fullPage: true,
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "tmp/screenshots/connected-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  for (const [kind, expected] of [
    ["chapter", "UPDATED: écoute active et curiosité."],
    ["book", "Saved chapter text."],
    ["article", "Comprendre avant de répondre."],
    ["vocabulary", "Paying close attention."],
  ]) {
    const parser = new PDFParse({
      data: new Uint8Array(readFileSync(`tmp/pdfs/browser-${kind}.pdf`)),
    });
    const extracted = await parser.getText();
    expect(extracted.text).toContain(expected);
    await parser.destroy();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your next chapter starts here" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Learning journal/ }),
  ).not.toBeVisible();
});
