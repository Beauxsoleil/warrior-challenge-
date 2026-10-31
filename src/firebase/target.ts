// Public project identifiers only. Runtime selection never grants permission.
export const rootCollection = "warriorChallenges";
export function selectTarget(
  env: Record<string, string | undefined>,
  hostname: string,
) {
  const target = env.VITE_FIREBASE_TARGET ?? "emulator";
  if (target === "emulator") {
    if (!["localhost", "127.0.0.1"].includes(hostname))
      throw new Error(
        "Emulator build requires a local browser. Do not expose emulators publicly.",
      );
    return {
      emulator: true,
      config: {
        projectId: "demo-warrior-challenge",
        apiKey: "demo-not-a-secret",
        authDomain: "localhost",
      },
    };
  }
  if (
    target !== "pibase" ||
    env.VITE_PIBASE_INTEGRATION_ACK !== "shared-rules-reviewed"
  )
    throw new Error(
      "PIBASE integration requires an explicit reviewed shared-Rules build. No fallback project is selected.",
    );
  return {
    emulator: false,
    config: {
      projectId: "pi-base-a3a09",
      authDomain: "pi-base-a3a09.firebaseapp.com",
      apiKey: "AIzaSyAp-OSq87o6e4XBsSryh5ozwzw5543oKQE",
      appId: "1:693559040921:web:52651b1709f3610dd01108",
    },
  };
}
export const databaseNameFor = (projectId: string) =>
  `warrior-challenge:${projectId}:${rootCollection}:v1`;
