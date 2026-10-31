import { test, expect, type Page } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { documents, projectId, password } from "../../scripts/fixtures";
async function login(page: Page, uid: string) {
  await page.goto("/");
  await page
    .getByLabel("Email", { exact: true })
    .fill(uid + "@practice.invalid");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm and save score" }),
  ).toBeEnabled();
}
async function localRows(page: Page) {
  return page.evaluate(async () => {
    const storePath = "/src/persistence/store.ts";
    const { LocalStore, namespace } = (await import(
      /* @vite-ignore */ storePath
    )) as typeof import("../../src/persistence/store");
    const clientPath = "/src/firebase/client.ts";
    const { auth, storageDatabaseName } = (await import(
      /* @vite-ignore */ clientPath
    )) as typeof import("../../src/firebase/client");
    const s = await LocalStore.open(storageDatabaseName);
    try {
      return await s.list(namespace("practice", auth.currentUser!.uid));
    } finally {
      s.db.close();
    }
  });
}
test.beforeEach(async () => {
  const env = await initializeTestEnvironment({
    projectId,
    firestore: { host: "127.0.0.1", port: 8080 },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const [path, value] of Object.entries(documents))
      await setDoc(doc(ctx.firestore(), path), value);
  });
  await env.cleanup();
});
for (const reconnect of [
  [0, 1],
  [1, 0],
])
  test(
    "two offline scorers preserve both roots, reconnect " + reconnect.join(","),
    async ({ browser }) => {
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
      ]);
      try {
        const pages = await Promise.all(contexts.map((c) => c.newPage()));
        await login(pages[0], "scorer-a");
        await login(pages[1], "scorer-b");
        await login(pages[2], "admin");
        for (let i = 0; i < 2; i++) {
          await pages[i]
            .getByLabel("Pause uploader for practice outage")
            .check();
          await contexts[i].setOffline(true);
          await pages[i]
            .getByLabel("Score (whole points, 0–100)")
            .fill(String(40 + i * 10));
          await pages[i]
            .getByRole("button", { name: "Confirm and save score" })
            .click();
          await expect
            .poll(async () => (await localRows(pages[i])).length)
            .toBe(1);
          expect((await localRows(pages[i]))[0].state).toBe(
            "saved_locally_pending_sync",
          );
        }
        for (const i of reconnect) {
          await contexts[i].setOffline(false);
          await pages[i]
            .getByLabel("Pause uploader for practice outage")
            .uncheck();
          await expect
            .poll(async () => (await localRows(pages[i]))[0]?.state)
            .toBe("synced");
        }
        await expect(pages[2].getByTestId("outcome")).toHaveText("CONFLICT");
        await pages[2].getByLabel("Score (whole points, 0–100)").fill("45");
        await pages[2]
          .getByLabel("Correction / resolution reason")
          .fill("Practice official review of both branches");
        await pages[2]
          .getByRole("button", { name: "Resolve 2 competing heads" })
          .click();
        for (const page of pages)
          await expect(page.getByTestId("outcome")).toHaveText("VALID · 45");
      } finally {
        for (const c of contexts) await c.close();
      }
    },
  );
test("own undo and linked replacement preserve all three records", async ({
  page,
}) => {
  await login(page, "scorer-a");
  await page.getByRole("button", { name: "Confirm and save score" }).click();
  await page.getByRole("button", { name: /Undo this entry/ }).click();
  await expect(page.getByTestId("outcome")).toHaveText("VOID");
  await page
    .getByLabel("Correction / resolution reason")
    .fill("Replace mistaken score");
  await page.getByLabel("Score (whole points, 0–100)").fill("70");
  await page
    .getByRole("button", { name: "Replace own void (reason required)" })
    .click();
  await expect(page.getByTestId("outcome")).toHaveText("VALID · 70");
  const rows = await localRows(page);
  expect(rows).toHaveLength(3);
  const v = rows.find((r) => r.operation.kind === "result.void")!;
  expect(
    rows.find((r) => r.operation.kind === "result.correct")?.operation
      .parentIds,
  ).toEqual([v.operation.opId]);
});
test("two tabs share one uploader lock and one immutable capture", async ({
  page,
  context,
}) => {
  await login(page, "scorer-a");
  const other = await context.newPage();
  await other.goto("/");
  await expect(
    other.getByRole("button", { name: "Confirm and save score" }),
  ).toBeEnabled();
  // Hold the actual Web Lock to prove both tab uploaders wait.
  await page.evaluate(() => {
    const ns = JSON.stringify(["practice", "scorer-a"]);
    void navigator.locks.request("warrior-uploader:" + ns, async () => {
      await new Promise<void>((resolve) => {
        (window as unknown as { releaseUpload: () => void }).releaseUpload =
          resolve;
      });
    });
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as unknown as { releaseUpload?: () => void }).releaseUpload,
        ),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Confirm and save score" }).click();
  await expect.poll(async () => (await localRows(page)).length).toBe(1);
  expect((await localRows(page))[0].state).toBe("saved_locally_pending_sync");
  await page.evaluate(() =>
    (window as unknown as { releaseUpload: () => void }).releaseUpload(),
  );
  await expect
    .poll(async () => (await localRows(page))[0].state)
    .toBe("synced");
  await expect(other.getByTestId("outcome")).toHaveText("VALID · 50");
  expect(await localRows(other)).toHaveLength(1);
});
test("rejected intent survives reload, export and account switching", async ({
  page,
}) => {
  await login(page, "scorer-a");
  await page.getByLabel("Pause uploader for practice outage").check();
  await page.getByRole("button", { name: "Confirm and save score" }).click();
  await expect.poll(async () => (await localRows(page)).length).toBe(1);
  const original = (await localRows(page))[0].operation;
  const env = await initializeTestEnvironment({
    projectId,
    firestore: { host: "127.0.0.1", port: 8080 },
  });
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(
      doc(ctx.firestore(), "warriorChallenges/practice/events/grenade"),
      { state: "locked" },
      { merge: true },
    ),
  );
  await env.cleanup();
  await page.getByLabel("Pause uploader for practice outage").uncheck();
  await expect
    .poll(async () => (await localRows(page))[0].state)
    .toBe("needs_review");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Export private outbox JSON" }),
  ).toBeVisible();
  expect((await localRows(page))[0].operation).toEqual(original);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export private outbox JSON" })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("private-practice-outbox.json");
  const stream = await file.createReadStream();
  let contents = "";
  for await (const chunk of stream!) contents += chunk.toString();
  const exported = JSON.parse(contents);
  expect(exported.entries[0].operation).toEqual(original);
  expect(exported.entries[0].state).toBe("needs_review");
  expect(contents).not.toContain("refreshToken");
  await page
    .getByRole("button", { name: "Sign out (retain captures)" })
    .click();
  await page
    .getByLabel("Email", { exact: true })
    .fill("scorer-b@practice.invalid");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Export private outbox JSON" }),
  ).toBeVisible();
  expect(await localRows(page)).toEqual([]);
});
