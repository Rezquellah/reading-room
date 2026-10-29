import { test, expect } from "@playwright/test";

test("welcome answers survive confirmation and provision one personalized workspace", async ({
  page,
  context,
}) => {
  expect(
    (await page.request.post("/api/onboarding", { data: {} })).status(),
  ).toBe(401);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app?auth=signup");
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "What language will you learn in?" }),
  ).toBeVisible();
  await dialog.getByLabel("Learning language").selectOption("Other");
  await dialog.getByLabel("Your language", { exact: true }).fill("Dutch");
  await expect(dialog).toContainText("Dutch Library");
  await dialog.getByLabel("Learning language").selectOption("English");
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog.getByRole("radio", { name: /Prepare for an exam/ }).check();
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog.getByRole("radio", { name: /^5 minutes/ }).check();
  await dialog
    .getByLabel(/What would you like to explore/)
    .fill("Biology final exam");
  await dialog.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/onboarding-mobile.png" });
  await dialog.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    dialog.getByRole("radio", { name: /Prepare for an exam/ }),
  ).toBeChecked();
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(dialog.getByLabel(/What would you like to explore/)).toHaveValue(
    "Biology final exam",
  );
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(dialog).toContainText("English Library");
  await dialog.getByLabel("Email", { exact: true }).fill("reader@example.test");
  await dialog
    .getByLabel("Password", { exact: true })
    .fill("test-only-password");
  await dialog.getByRole("button", { name: "Create my reading room" }).click();
  await expect(
    dialog.getByRole("heading", { name: "One small step: check your email." }),
  ).toBeVisible();
  // Simulate the authenticated return after email confirmation, using the test harness.
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "reader@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
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
  const results = await Promise.all([
    page.request.post("/api/onboarding", { data: {} }),
    page.request.post("/api/onboarding", { data: {} }),
  ]);
  for (const result of results) expect(result.ok()).toBe(true);
  const setup = await results[0].json();
  expect((await results[1].json()).workspaceId).toBe(setup.workspaceId);
  const state = await (await page.request.get("/api/data")).json();
  const matches = state.workspaces.filter(
    (w: { id: string }) => w.id === setup.workspaceId,
  );
  expect(matches).toHaveLength(1);
  expect(matches[0]).toMatchObject({
    name: "English Library",
    language: "English",
    user_id: user.id,
  });
  await page.goto("/app");
  await expect(
    page.getByRole("region", { name: "Your learning starter plan" }),
  ).toContainText("Prepare for an exam");
  await expect(
    page.getByRole("region", { name: "Your learning starter plan" }),
  ).toContainText("5 minutes");
  await page
    .getByRole("button", { name: "Add your first reading", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Biology foundations");
  await page.getByRole("button", { name: "Add book", exact: true }).click();
  await page
    .getByRole("button", { name: "Study with ChatGPT", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: /^Learning goal/ }),
  ).toHaveValue("exam");
  await expect(
    page.getByRole("combobox", { name: /^Detail level/ }),
  ).toHaveValue("Essentials");
  await expect(page.getByLabel("Study prompt")).toHaveValue(
    /Biology final exam/,
  );
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Your learning starter plan" }),
  ).toBeVisible();
  const after = await (await page.request.get("/api/data")).json();
  expect(
    after.workspaces.filter((w: { id: string }) => w.id === setup.workspaceId),
  ).toHaveLength(1);
});
