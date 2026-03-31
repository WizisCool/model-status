import { createDb } from "./apps/api/src/db.ts";
const db = createDb("./data/model-status.db");
console.log("=== Upstreams ===");
console.log(JSON.stringify(db.listUpstreams(false), null, 2));
console.log("\n=== Models ===");
console.log(JSON.stringify(db.listModels(), null, 2));
db.close();
