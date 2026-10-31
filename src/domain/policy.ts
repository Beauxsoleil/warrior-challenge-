// Proposed practice defaults. This is NOT an organizer approval record.
export const practicePolicy = Object.freeze({
  version: "practice-v1",
  approval: "DRAFT" as const,
  mode: "practice" as const,
  fieldSizeSource: "frozen eligible roster per division",
  points: "N - place + 1",
  tiePayout: "competition",
  ordinalPlaces: true,
  weights: 1,
  terminalPointsHalf: 0,
  unresolvedPointsHalf: null,
  awardsRequireAllMandatoryValid: true,
  sharedFirstCountsAsWin: true,
  overallTieLadder: ["pointsHalf", "event wins", "ruck place", "shared place"],
  officialStartAllowed: false,
  officialPublicationAllowed: false,
});
export function requireOfficialApproval(): never {
  throw new Error(
    "Official capture is not implemented. Policies, authenticated approvals and frozen roster must be completed in M2.",
  );
}
