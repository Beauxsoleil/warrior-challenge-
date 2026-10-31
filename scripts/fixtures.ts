export const projectId = "demo-warrior-challenge";
export const users = ["scorer-a", "scorer-b", "admin"] as const;
export const password = "synthetic-practice-only";
export const documents: Record<string, object> = {
  "warriorChallenges/practice": {
    mode: "practice",
    rulesVersion: "practice-v1",
    rosterVersion: "synthetic-v1",
    policyApproval: "DRAFT",
  },
  "warriorChallenges/practice/events/grenade": {
    name: "Practice numeric station",
    kind: "numeric",
    minimum: 0,
    maximum: 100,
    state: "open",
  },
  "warriorChallenges/practice/events/other": {
    name: "Other station (authorization test)",
    kind: "numeric",
    minimum: 0,
    maximum: 100,
    state: "open",
  },
  ...Object.fromEntries(
    ["A", "B"].map((id) => [
      "warriorChallenges/practice/teams/" + id,
      {
        label: "Synthetic Team " + id,
        bib: id === "A" ? "001" : "002",
        eligible: true,
        rosterVersion: "synthetic-v1",
      },
    ]),
  ),
  ...Object.fromEntries(
    users.map((uid) => [
      "warriorChallenges/practice/members/" + uid,
      {
        active: true,
        role: uid === "admin" ? "admin" : "scorer",
        eventIds: ["grenade"],
      },
    ]),
  ),
};
