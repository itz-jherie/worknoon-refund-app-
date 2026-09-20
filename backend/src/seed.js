import "dotenv/config";
import { initDb, seedIfEmpty, pool } from "./db.js";

// Manual seed utility: `npm run seed`
const seeded = await initDb().then(seedIfEmpty);
console.log(seeded ? "Database seeded." : "Database already contains data — skipped.");
await pool.end();
