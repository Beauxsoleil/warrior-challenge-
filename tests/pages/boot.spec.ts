import { test, expect } from "@playwright/test";
test("built Pages app loads at the repository path without contacting production", async ({ page }) => {
  // Never contact live Auth/Firestore during this smoke test.
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === "http://127.0.0.1:4173"
      ? route.continue()
      : route.abort(),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByText(/Local database ready/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Practice setup unavailable" })).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.reload();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});
