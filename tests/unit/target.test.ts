import { describe, it, expect } from "vitest";
import {
  selectTarget,
  databaseNameFor,
  rootCollection,
} from "../../src/firebase/target";
describe("explicit shared-project target", () => {
  it("defaults to emulators only on loopback and never silently selects production", () => {
    expect(selectTarget({}, "localhost").config.projectId).toBe(
      "demo-warrior-challenge",
    );
    expect(() => selectTarget({}, "example.com")).toThrow();
    expect(() =>
      selectTarget({ VITE_FIREBASE_TARGET: "typo" }, "localhost"),
    ).toThrow();
  });
  it("requires explicit target plus review acknowledgement", () => {
    expect(() =>
      selectTarget({ VITE_FIREBASE_TARGET: "pibase" }, "localhost"),
    ).toThrow();
    const t = selectTarget(
      {
        VITE_FIREBASE_TARGET: "pibase",
        VITE_PIBASE_INTEGRATION_ACK: "shared-rules-reviewed",
      },
      "example.com",
    );
    expect(t.emulator).toBe(false);
    expect(t.config.projectId).toBe("pi-base-a3a09");
  });
  it("keeps live and emulator outboxes separate without erasing old stores", () => {
    expect(databaseNameFor("pi-base-a3a09")).not.toBe(
      databaseNameFor("demo-warrior-challenge"),
    );
    expect(databaseNameFor("pi-base-a3a09")).not.toBe("warrior-challenge-v1");
    expect(rootCollection).toBe("warriorChallenges");
  });
});
