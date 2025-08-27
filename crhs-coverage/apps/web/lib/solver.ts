import Munkres from "munkres-js";  // optional Hungarian
import { randomUUID } from "crypto";

export type Need = { id: number; slotId: number; period: number; absentTeacherId: number; courseText?: string };
export type Candidate = {
  teacherId: number; name: string;
  freeToday: number; coversWeek: number; coversMonth: number; coversQuarter: number;
};

export type Weights = { wFree: number; wWeek: number; wMonth: number; wQuarter: number; jitter: number };
export const defaultW: Weights = { wFree: 1.0, wWeek: 0.6, wMonth: 0.3, wQuarter: 0.1, jitter: 1e-3 };

export function score(c: Candidate, w: Weights, rng: () => number) {
  return + w.wFree * c.freeToday
         - w.wWeek * c.coversWeek
         - w.wMonth * c.coversMonth
         - w.wQuarter * c.coversQuarter
         + w.jitter * rng();
}

export function greedyAssign(needs: Need[], candMap: Record<number, Candidate[]>, seed?: string, w = defaultW) {
  const used = new Set<number>();
  const rng = seed ? seeded(seed) : Math.random;
  const order = [...needs].sort((a,b) => (candMap[a.id]?.length ?? 0) - (candMap[b.id]?.length ?? 0));

  const picks: Record<number, number|null> = {};
  for (const need of order) {
    const pool = (candMap[need.id] ?? []).filter(c => !used.has(c.teacherId));
    pool.sort((a,b) => score(b,w,rng) - score(a,w,rng));
    const pick = pool[0];
    picks[need.id] = pick ? pick.teacherId : null;
    if (pick) used.add(pick.teacherId);
  }
  return { picks, seed: seed ?? randomUUID() };
}

export function hungarianAssign(needs: Need[], candMap: Record<number, Candidate[]>, seed?: string, w = defaultW) {
  // Build cost matrix (negated score); pad with dummies
  const rng = seed ? seeded(seed) : Math.random;
  const n = needs.length;
  const allTeachers = Array.from(new Set(needs.flatMap(n => candMap[n.id]?.map(c => c.teacherId) ?? [])));
  const teacherIndex = new Map(allTeachers.map((t,i)=>[t,i]));
  const cost = Array.from({length:n}, (_,i)=>Array(allTeachers.length).fill(1e6));

  for (let i=0;i<n;i++) {
    const need = needs[i];
    for (const c of candMap[need.id] ?? []) {
      const j = teacherIndex.get(c.teacherId)!;
      cost[i][j] = -score(c, w, rng); // hungarian minimizes
    }
  }
  const m = new Munkres();
  const pairs = m.compute(cost);
  const picks: Record<number, number|null> = {};
  for (const [i,j] of pairs) {
    const tId = allTeachers[j];
    // if the cell was dummy high cost, treat as unassigned
    if (cost[i][j] > 1e5) picks[needs[i].id] = null;
    else picks[needs[i].id] = tId;
  }
  return { picks, seed: seed ?? randomUUID() };
}

function seeded(s: string) {
  let h = 2166136261;
  for (let i=0;i<s.length;i++) { h ^= s.charCodeAt(i); h += (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24); }
  return () => (h = (h * 1664525 + 1013904223) >>> 0, (h % 1e9) / 1e9);
}
