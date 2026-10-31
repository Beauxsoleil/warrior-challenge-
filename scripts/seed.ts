import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { projectId, users, password, documents } from "./fixtures.ts";
// Explicit fixed loopback + demo ID. This tool has no production mode.
if (
  process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
)
  throw new Error(
    "Refusing seed: start local emulators; require exact loopback emulator environment.",
  );
const env = await initializeTestEnvironment({
  projectId,
  firestore: { host: "127.0.0.1", port: 8080 },
});
try {
  for (const uid of users) {
    const response = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/" +
        projectId +
        "/accounts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer owner",
        },
        body: JSON.stringify({
          localId: uid,
          email: uid + "@practice.invalid",
          password,
          emailVerified: true,
        }),
      },
    );
    if (!response.ok) {
      const body = await response.text();
      if (
        !body.includes("EMAIL_EXISTS") &&
        !body.includes("DUPLICATE_LOCAL_ID")
      )
        throw new Error(body);
    }
  }
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const [path, value] of Object.entries(documents))
      await setDoc(doc(ctx.firestore(), path), value);
  });
  console.log(
    "Synthetic practice seeded. Accounts: scorer-a, scorer-b, admin @practice.invalid. Password: synthetic-practice-only",
  );
} finally {
  await env.cleanup();
}
