import React from "react";

type DayType = "A" | "B";

interface AbsenceFormProps {
  date: string;
  onDateChange: (v: string) => void;
  dayType: DayType;
  onDayTypeChange: (v: DayType) => void;
  absent: string; // comma-separated teacher IDs for MVP
  onAbsentChange: (v: string) => void;
}

export default function AbsenceForm({
  date,
  onDateChange,
  dayType,
  onDayTypeChange,
  absent,
  onAbsentChange
}: AbsenceFormProps) {
  return (
    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(5, 1fr)" }}>
      <label>
        Date{" "}
        <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
      </label>

      <label>
        Day{" "}
        <select
          value={dayType}
          onChange={(e) => onDayTypeChange(e.target.value as DayType)}
        >
          <option value="A">A</option>
          <option value="B">B</option>
        </select>
      </label>

      <label>
        Absent Teacher IDs (comma)
        <input
          value={absent}
          onChange={(e) => onAbsentChange(e.target.value)}
          placeholder="e.g. 3,7"
        />
      </label>

      {/* spacer cells to keep layout tidy */}
      <div />
      <div />
    </div>
  );
}
