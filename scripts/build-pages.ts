import { build } from "vite";
// Public Firebase configuration only. Building does not deploy or access data.
process.env.VITE_FIREBASE_TARGET = "pibase";
process.env.VITE_PIBASE_INTEGRATION_ACK = "shared-rules-reviewed";
await build({ base: "/warrior-challenge-/" });
