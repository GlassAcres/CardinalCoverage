import { useState } from "react";
import AbsenceForm from "../components/AbsenceForm";
import SeedControls from "../components/SeedControls";
import PlanTable from "../components/PlanTable";

const API = ""; // same-origin; works in one-port mode and with Vite proxy in dev

type DayType = "A" | "B";

export default function Planner() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dayType, setDayType] = useState<DayType>("A");
  const [absent, setAbsent] = useState<string>(""); // comma-separated teacher IDs
  const [seed, setSeed] = useState<string>("");
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  async function buildNeeds() {
    const absentIds = absent.split(",").map(s => Number(s.trim())).filter(Boolean);
    const r = await fetch(`${API}/api/plan/needs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, day_type: dayType, absent_teacher_ids: absentIds })
    });
    if (!r.ok) throw new Error(`Needs failed: ${r.status}`);
    return r.json();
  }

  async function compute(strategy: "greedy" | "hungarian") {
    try {
      setLoading(true);
      setErr(null);
      await buildNeeds();
      const r = await fetch(`${API}/api/plan/compute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, day_type: dayType, seed, strategy })
      });
      if (!r.ok) throw new Error(`Compute failed: ${r.status}`);
      const data = await r.json();
      setPlan(data);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function commit() {
    if (!plan) return;
    try {
      setLoading(true);
      setErr(null);
      const r = await fetch(`${API}/api/plan/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, assignments: plan.assignments, seed })
      });
      if (!r.ok) throw new Error(`Commit failed: ${r.status}`);
      const out = await r.json();
      alert(`Committed: ${JSON.stringify(out)}`);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Daily Coverage Planner</h2>

      <AbsenceForm
        date={date}
        onDateChange={setDate}
        dayType={dayType}
        onDayTypeChange={setDayType}
        absent={absent}
        onAbsentChange={setAbsent}
      />

      <SeedControls
        seed={seed}
        onSeedChange={setSeed}
        onComputeGreedy={() => compute("greedy")}
        onComputeHungarian={() => compute("hungarian")}
      />

      {loading && <div style={{ marginTop: 10 }}>Working…</div>}
      {err && <div style={{ marginTop: 10, color: "crimson" }}>{err}</div>}

      <PlanTable plan={plan} onCommit={commit} />
    </div>
  );
}
