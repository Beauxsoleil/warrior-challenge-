# GitHub Pages practice build

## Observed failure (2026-10-31)

The live site returned source index.html referencing /src/main.tsx. The automatic
branch-root Pages deployment did not compile TypeScript or bundle the app.
The repository subpath also requires the correct asset base. A default emulator
build intentionally refuses remote hosts.

## Build and test

- npm run build:pages builds dist with /warrior-challenge-/ asset paths and the
  explicit PIBASE public configuration. It makes no backend writes or deployment.
- npm run test:pages builds and runs a Chromium production-bundle smoke test.
  All external network requests are blocked; login render, IndexedDB readiness
  and reload are checked. This is not a live login or authorized-domain test.
- npm run build still defaults to local emulator configuration.

## Owner-authorized publication

After review/merge and explicit deployment approval:

1. In repository Settings > Pages > Build and deployment, select GitHub Actions
   as Source. Do not deploy the source repository root.
2. In Actions, manually run Publish practice site on main. No push/PR triggers
   deployment. The workflow tests and uploads only dist, then deploys it.
3. Verify https://beauxsoleil.github.io/warrior-challenge-/ loads. Then use a
   separately provisioned Warrior account for authorized live practice testing.
4. If needed, revert the frontend change and manually publish the reviewed prior
   build. This workflow never changes Firestore Rules or existing PIBASE hosting.

The GitHub connector used for this repair cannot change Pages administration
settings. The owner must select the source in Settings (or authorize a supported
browser handoff). No site deployment or live account creation was performed.

This is M1 numeric practice capture, not the full event application. Actual
Warrior accounts, membership/config/teams for practice, Auth authorized domains,
and any App Check enforcement must be verified separately. Synthetic emulator
credentials do not exist automatically in PIBASE. Do not seed production with
the emulator seed script. Shared project quota still applies.

## References checked 2026-10-31

- https://vite.dev/guide/static-deploy (repository base and Pages build)
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

GitHub Pages is used here to repair the existing owner-selected site. Classic
Firebase Hosting remains the original planned production option; no Firebase
Hosting deployment, billing change, or event-readiness approval is implied.
