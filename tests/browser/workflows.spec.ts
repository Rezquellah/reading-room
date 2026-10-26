import { test, expect } from "@playwright/test";
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "reader@example.test",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: new Date().toISOString(),
};
test.beforeEach(async ({ context }) => {
  const session = {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 36000,
    expires_in: 36000,
    token_type: "bearer",
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
});
test("complete bilingual reading, notes, recall, export, and restore journey", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start here", exact: true })
    .first()
    .click();
  await page.getByLabel("Workspace name").fill("English Library");
  await page
    .getByRole("button", { name: "Save workspace", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Add reading", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Deep Work — QA");
  await page.getByLabel("Author", { exact: true }).fill("Cal Newport");
  await page.getByLabel("Total chapters").fill("20");
  await page.getByLabel("Current chapter").fill("7");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("Reading");
  await page.getByRole("button", { name: "Add book", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Deep Work — QA", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chapters", exact: true }).click();
  await page.getByRole("button", { name: "Add chapter", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Focus and attention");
  await page.getByLabel("Chapter number").fill("1");
  await page.getByRole("button", { name: "Add chapter", exact: true }).click();
  await page
    .getByRole("button", { name: "Study with ChatGPT", exact: true })
    .click();
  await expect(page.getByLabel("Study prompt")).toHaveValue(
    /reading-room-study-v1/,
  );
  await expect(page.getByLabel("Study approach")).toHaveValue("english");
  await expect(page.getByLabel("Study prompt")).toHaveValue(/English coach/);
  await page.getByLabel("Study approach").selectOption("book");
  await expect(page.getByLabel("Study prompt")).not.toHaveValue(/English coach/);
  await page.getByLabel("Study approach").selectOption("english");
  await page
    .getByRole("button", { name: "2. Save your learning", exact: true })
    .click();
  await page.getByLabel("Paste the study pack").fill(
    JSON.stringify({
      format: "reading-room-study-v1",
      notes: [
        {
          title: "Study session reflection",
          text: "La mémoire se construit par le rappel.",
        },
      ],
      vocabulary: [
        { word: "rappel", definition: "Recall", example: "Le rappel actif." },
      ],
      cards: [
        { question: "What strengthens memory?", answer: "Active recall." },
      ],
    }),
  );
  await page
    .getByRole("button", { name: "Preview import", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save 3 selected items", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved 3 items");
  await page
    .getByRole("button", { name: "Save 3 selected items", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Saved 0 items. Skipped 3",
  );
  await page.screenshot({
    path: "test-results/study-import.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Close study workflow", exact: true })
    .click();
  const importedState = await (await page.request.get("/api/data")).json();
  const importedNote = importedState.entries.find(
    (e: { title: string }) => e.title === "Study session reflection",
  );
  expect(importedNote.parent_id).toBe(
    importedState.entries.find(
      (e: { title: string }) => e.title === "Focus and attention",
    ).id,
  );
  await page.getByRole("button", { name: "Write a note", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Attention is a practice");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  const editor = page.locator(".tiptap");
  await editor.fill(
    "Focused attention creates meaningful work. Écouter, réfléchir, apprendre.",
  );
  await page.getByRole("button", { name: "Insert table", exact: true }).click();
  await expect(editor.locator("table")).toBeVisible();
  await page.locator(".editor input[type=file]").setInputFiles({
    name: "note-image.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(editor.locator("img")).toBeVisible();
  await page.getByRole("button", { name: "Save now", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Search ⌘ K" }).click();
  await page.getByLabel("Search content").fill("Attention is a practice");
  await page.getByRole("button", { name: /Attention is a practice/ }).click();
  await expect(editor).toContainText("Écouter, réfléchir, apprendre.");
  await expect(editor.locator("table")).toBeVisible();
  await expect(editor.locator("img")).toBeVisible();
  await page.route("**/api/data", async (route) => {
    if (route.request().method() === "POST")
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Offline test" }),
      });
    else await route.continue();
  });
  await editor.press("Control+End");
  await editor.press("Enter");
  await editor.pressSequentially("Offline thought safely recovered.");
  await expect(page.getByRole("status")).toContainText("Not synced");
  await page.unroute("**/api/data");
  await page.getByRole("button", { name: "Save now", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page
    .getByRole("button", { name: "Make recall card from selection" })
    .click();
  await page.getByLabel("Recall question").fill("What helps us focus?");
  await page
    .getByLabel("Answer", { exact: true })
    .fill("Undivided attention and an intentional practice.");
  await page.getByRole("button", { name: "Add card", exact: true }).click();
  await page
    .getByRole("button", { name: /^Review/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Review 2 due cards/ }).click();
  const reviewedAnswers: string[] = [];
  for (let i = 0; i < 2; i++) {
    await expect(page.locator(".answer")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Reveal answer", exact: true })
      .click();
    reviewedAnswers.push(await page.locator(".answer").innerText());
    await page.getByRole("button", { name: "Good", exact: true }).click();
  }
  expect(reviewedAnswers.sort()).toEqual(
    [
      "Active recall.",
      "Undivided attention and an intentional practice.",
    ].sort(),
  );
  await expect(
    page.getByText("A little more connected.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Vocabulary", exact: true }).click();
  await page.getByRole("button", { name: "Add word", exact: true }).click();
  await page.getByLabel("Word or expression").fill("serendipity");
  await page
    .getByLabel("Definition", { exact: true })
    .fill("A happy discovery by chance.");
  await page
    .getByRole("button", { name: "Add vocabulary", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Settings & workspaces", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await page.getByLabel("Workspace name").fill("Bibliothèque française");
  await page.getByLabel("Language code").fill("fr");
  await page
    .getByRole("button", { name: "Save workspace", exact: true })
    .click();
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByRole("button", { name: /Add article/ }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("L’art de prêter attention");
  await page.getByLabel("Original URL").fill("https://example.org/attention");
  await page.getByRole("button", { name: "Add article", exact: true }).click();
  await page.getByRole("button", { name: "Write a note", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Réflexions françaises");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await editor.fill(
    "La curiosité nourrit la mémoire. Une idée à appliquer chaque jour.",
  );
  await page.getByRole("button", { name: "Save now", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  const state = await (await page.request.get("/api/data")).json();
  expect(state.reviews).toHaveLength(2);
  const note = state.entries.find(
    (e: { title: string }) => e.title === "Réflexions françaises",
  );
  const pdf = await page.request.get(
    `/api/pdf?scope=${note.id}&workspace=all&paper=A4&style=styled`,
    { timeout: 60000 },
  );
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  await pdf
    .body()
    .then((b) =>
      import("node:fs/promises").then((fs) =>
        fs
          .mkdir("test-results", { recursive: true })
          .then(() => fs.writeFile("test-results/french-notes.pdf", b)),
      ),
    );
  const backup = await (await page.request.get("/api/backup")).json();
  const restore = await page.request.post("/api/backup", { data: backup });
  expect(restore.status()).toBe(200);
  expect((await restore.json()).inserted).toBe(0);
  await page
    .getByRole("button", { name: "Dark appearance", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: "test-results/desktop-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => (await page.locator(".editor").boundingBox())!.width)
    .toBeLessThanOrEqual(350);
  await page.screenshot({
    path: "test-results/mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
