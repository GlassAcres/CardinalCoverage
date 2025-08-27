import React from "react";

interface Need {
  id: number;
  slot_id: number;
  absent_teacher_id: number;
  date: string;
}

interface CandidateRow {
  teacher_id: number;
  name: string;
  free_today: number;
  covers_week: number;
  covers_month: number;
  covers_quarter: number;
}

interface Plan {
  needs: Need[];
  cand_map: Record<number, CandidateRow[]>;
  assignments: Record<number, number | null>;
}

interface PlanTableProps {
  plan: Plan | null;
  onCommit: () => void;
}

export default function PlanTable({ plan, onCommit }: PlanTableProps) {
  if (!plan) {
    return (
      <div style={{ marginTop: 16, color: "#666" }}>
        No plan yet. Enter details and click Compute.
      </div>
    );
  }

  const rows = plan.needs.map((n) => {
    const assigned = plan.assignments[n.id] ?? null;
    const candidates = plan.cand_map[n.id] ?? [];
    return {
      needId: n.id,
      slotId: n.slot_id,
      absentTeacherId: n.absent_teacher_id,
      assignedTeacherId: assigned,
      candidateCount: candidates.length
    };
  });

  return (
    <div style={{ marginTop: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: "8px" }}>Need ID</th>
            <th style={{ padding: "8px" }}>Slot ID</th>
            <th style={{ padding: "8px" }}>Absent Teacher ID</th>
            <th style={{ padding: "8px" }}>Assigned Teacher ID</th>
            <th style={{ padding: "8px" }}>Candidate Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.needId} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "8px" }}>{r.needId}</td>
              <td style={{ padding: "8px" }}>{r.slotId}</td>
              <td style={{ padding: "8px" }}>{r.absentTeacherId}</td>
              <td style={{ padding: "8px" }}>
                {r.assignedTeacherId !== null ? r.assignedTeacherId : "—"}
              </td>
              <td style={{ padding: "8px" }}>{r.candidateCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 12 }}>
        <button onClick={onCommit}>Commit Plan</button>
      </div>
    </div>
  );
}
