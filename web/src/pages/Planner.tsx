import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export default function Planner() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [dayType, setDayType] = useState<"A"|"B">("A");
  const [absent, setAbsent] = useState<string>(""); // comma separated teacher IDs (for MVP)
  const [seed, setSeed] = useState<string>("");
  const [plan, setPlan] = useState<any>(null);

  async function buildNeeds() {
    const absentIds = absent.split(",").map(s=>Number(s.trim())).filter(Boolean);
    const r = await fetch(`${API}/api/plan/needs`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ date, day_type: dayType, absent_teacher_ids: absentIds })
    });
    return r.json();
  }

  async function compute(strategy:"greedy"|"hungarian") {
    await buildNeeds();
    const r = await fetch(`${API}/api/plan/compute`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ date, day_type: dayType, seed, strategy })
    });
    const data = await r.json(); setPlan(data);
  }

  async function commit() {
    if (!plan) return;
    const r = await fetch(`${API}/api/plan/commit`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ date, assignments: plan.assignments, seed })
    });
    alert("Committed: "+JSON.stringify(await r.json()));
  }

  return <div style={{padding:"1rem"}}>
    <h2>Daily Coverage Planner</h2>
    <div style={{display:"grid", gap:8, gridTemplateColumns:"repeat(5, 1fr)"}}>
      <label>Date <input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      <label>Day
        <select value={dayType} onChange={e=>setDayType(e.target.value as any)}>
          <option>A</option><option>B</option>
        </select>
      </label>
      <label>Absent Teacher IDs (comma) <input value={absent} onChange={e=>setAbsent(e.target.value)} placeholder="e.g. 3,7"/></label>
      <label>Seed <input value={seed} onChange={e=>setSeed(e.target.value)} placeholder="optional seed"/></label>
      <div style={{display:"flex", gap:8, alignItems:"end"}}>
        <button onClick={()=>compute("greedy")}>Compute (Greedy)</button>
        <button onClick={()=>compute("hungarian")}>Compute (Hungarian)</button>
      </div>
    </div>

    {plan && <>
      <h3>Assignments</h3>
      <pre style={{background:"#f7f7f7", padding:12, overflow:"auto"}}>{JSON.stringify(plan.assignments, null, 2)}</pre>
      <button onClick={commit}>Commit Plan</button>
    </>}
  </div>;
}
