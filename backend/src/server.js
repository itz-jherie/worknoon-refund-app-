import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb, seedIfEmpty, pool } from "./db.js";
import apiRouter from "./routes/api.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "64kb" }));

// Simple structured request log
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", apiRouter);

// Central error handler — never leaks stack traces to clients
app.use((err, _req, res, _next) => {
  console.error("[error]", err.message);
  res.status(err.status || 500).json({ error: err.expose ? err.message : "Internal server error" });
});

const PORT = process.env.PORT || 4000;

async function start() {
  await initDb();
  const seeded = await seedIfEmpty();
  if (seeded) console.log("Database seeded with mock CRM data.");
  app.listen(PORT, () => console.log(`Backend listening on :${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start:", err);
  pool.end();
  process.exit(1);
});
