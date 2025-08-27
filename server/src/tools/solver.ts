import type { CandidateRow, Need } from "../types";
import munkres from "munkres"; // Hungarian algorithm for JS :contentReference[oaicite:6]{index=6}

export type Strategy = "greedy" | "hungarian";

function score(c: CandidateRow, weights={free:1.0, week:0.6, month:0.3, quarter:0.1}, jitter=0.001, rnd=Math.random) {
  return (weights.free * c.free_today)
      - (weights.week * c.covers_week)
      - (weights.month * c.covers_month)
      - (weights.quarter * c.covers_quarter)
      + rnd()*jitter; // randomized tie-break
}

export function solveGreedy(needs: Need[], candMap: Map<number, CandidateRow[]>, seed?: string) {
  const rnd = seed ? seeded(seed) : Math.random;
  // order by most constrained first
  const ordered = [...needs].sort((a,b)=> (candMap.get(a.id)?.length??0) - (candMap.get(b.id)?.length??0));
  const used = new Set<number>();
  const out: Record<number, number|null> = {};
  for (const need of ordered) {
    const pool = (candMap.get(need.id) ?? []).filter(c=>!used.has(c.teacher_id));
    pool.sort((a,b)=> score(b, undefined, 0.001, rnd) - score(a, undefined, 0.001, rnd));
    const pick = pool[0];
    out[need.id] = pick ? pick.teacher_id : null;
    if (pick) used.add(pick.teacher_id);
  }
  return out;
}

export function solveHungarian(needs: Need[], candMap: Map<number, CandidateRow[]>, seed?: string) {
  const rnd = seed ? seeded(seed) : Math.random;
  // Build rectangular cost matrix (needs x candidatesUnique)
  const candidateIds = Array.from(new Set(
    [...candMap.values()].flat().map(c=>c.teacher_id)
  ));
  const needIdx = new Map(needs.map((n,i)=>[n.id,i]));
  const candIdx = new Map(candidateIds.map((id,i)=>[id,i]));

  // Initialize with large costs; fill where candidate available
  const rows = needs.length, cols = candidateIds.length;
  const cost: number[][] = Array.from({length: rows}, ()=> Array(cols).fill(1e6));

  for (const n of needs) {
    const i = needIdx.get(n.id)!;
    for (const c of (candMap.get(n.id)??[])) {
      const j = candIdx.get(c.teacher_id)!;
      const s = score(c, undefined, 0.001, rnd);
      cost[i][j] = -s; // maximize score == minimize negative score
    }
  }

  const pairs = munkres(cost);
  const out: Record<number, number|null> = {};
  const used = new Set<number>();

  for (const [i,j] of pairs) {
    if (i < rows && j < cols && cost[i][j] < 1e6) {
      const needId = needs[i].id;
      const teacherId = candidateIds[j];
      if (!used.has(teacherId)) {
        out[needId] = teacherId;
        used.add(teacherId);
      } else {
        out[needId] = null;
      }
    }
  }
  return out;
}

function seeded(seed: string) {
  // simple LCG
  let h = 2166136261 ^ [...seed].reduce((a,c)=>a+c.charCodeAt(0),0);
  return () => (h = Math.imul(h ^ (h>>>15), 2246822519) ^ 2654435761, ((h>>>0) % 10000) / 10000);
}
