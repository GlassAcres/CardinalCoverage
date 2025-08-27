"use client";
import { useState } from "react";

export default function Page() {
  const [date, setDate] = useState("");
  const [dayType, setDayType] = useState<"A"|"B">("A");
  const [seed, setSeed] = useState("");

  const [planRes, setPlanRes] = useState<any>(null);

  async function doPlan() {
    const r = await fetch("/api/plan", { method:"POST", body: JSON.stringify({ date, dayType, seed, method:"greedy" }) });
    setPlanRes(await r.json());
  }
  async function doCommit() {
    if (!planRes) return;
    await fetch("/api/commit", { method:"POST", body: JSON.stringify({ date, picks: planRes.picks, seed: planRes.seed }) });
    alert("Committed!");
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Daily Coverage Planner</h1>
      <div className="flex gap-2">
        <input className="border p-2" type="date" value={date} onChange={e=>setDate(e.target.value)} />
        <select className="border p-2" value={dayType} onChange={e=>setDayType(e.target.value as any)}>
          <option value="A">A day</option><option value="B">B day</option>
        </select>
        <input className="border p-2" placeholder="(optional) seed" value={seed} onChange={e=>setSeed(e.target.value)} />
        <button className="border px-4" onClick={doPlan}>Plan</button>
        <button className="border px-4" onClick={doCommit}>Commit</button>
      </div>

      {planRes && (
        <div className="space-y-2">
          <pre className="p-3 bg-gray-50 border">{JSON.stringify(planRes, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}
