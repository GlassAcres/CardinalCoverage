import type { CandidateRow, Need } from "../types";

export function humanExplain(needs: Need[], assignments: Record<number, number|null>, candMap: Map<number, CandidateRow[]>) {
  return needs.map(n => {
    const assigned = assignments[n.id];
    const options = (candMap.get(n.id)||[])
      .map(c => `${c.name} [free:${c.free_today} w:${c.covers_week} m:${c.covers_month} q:${c.covers_quarter}]`)
      .join(", ");
    return assigned
      ? `Need ${n.id}: assigned teacher ${assigned}. Candidates were: ${options}`
      : `Need ${n.id}: no available candidate. Candidates were: ${options}`;
  }).join("\n");
}
