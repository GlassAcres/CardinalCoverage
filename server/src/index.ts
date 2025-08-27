import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { coverageAgent } from "./agents/coverageAgent";
import { supabaseService } from "./tools/db";
import { candidatesForSlot } from "./tools/candidates";
import { solveGreedy, solveHungarian } from "./tools/solver";
import type { DayType, Need } from "./types";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Upload schedule
app.post("/api/schedule/upload", async (req, res) => {
  try {
    const { csvText } = req.body;
    const out = await coverageAgent.callTool("ingest_schedule_csv", { csvText }); // via tool
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Build needs
app.post("/api/plan/needs", async (req, res) => {
  try {
    const { date, day_type, absent_teacher_ids } = req.body;
    const out = await coverageAgent.callTool("create_needs", { date, day_type, absent_teacher_ids });
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Compute plan (code-orchestrated MVP; you can switch to full agent-run later)
app.post("/api/plan/compute", async (req, res) => {
  try {
    const { date, day_type, seed, strategy } = req.body as {
      date: string;
      day_type: DayType;
      seed?: string;
      strategy?: "greedy" | "hungarian";
    };
    const { data: needs, error } = await supabaseService
      .from("coverage_needs")
      .select("id, slot_id, absent_teacher_id, date")
      .eq("date", date);
    if (error) throw error;

    const absent = new Set(needs!.map((n) => n.absent_teacher_id));
    const candMap = new Map<number, any[]>();
    for (const n of needs!) {
      candMap.set(n.id, await candidatesForSlot(date, day_type, n.slot_id, [...absent]));
    }

    const assignments =
      strategy === "hungarian"
        ? solveHungarian(needs as Need[], candMap, seed)
        : solveGreedy(needs as Need[], candMap, seed);

    res.json({ needs, cand_map: Object.fromEntries(candMap), assignments });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Commit plan
app.post("/api/plan/commit", async (req, res) => {
  try {
    const { date, assignments, seed } = req.body;
    const out = await coverageAgent.callTool("commit_plan", { date, assignments, seed });
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Explain
app.post("/api/plan/explain", async (req, res) => {
  try {
    const { needs, assignments, cand_map } = req.body;
    const out = await coverageAgent.callTool("explain_plan", { needs, assignments, cand_map });
    res.json({ explanation: out });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Serve built React app in one-port mode ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../../web/dist");

if (process.env.SERVE_WEB_DIST === "1" || process.env.SERVE_WEB_DIST === "true") {
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, "0.0.0.0", () => console.log(`Server on :${PORT}`));
