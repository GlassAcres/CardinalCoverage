export type DayType = 'A'|'B';

export interface Need {
  id: number;
  slot_id: number;
  absent_teacher_id: number;
  date: string; // yyyy-mm-dd
}

export interface CandidateRow {
  teacher_id: number;
  name: string;
  free_today: number;
  covers_week: number;
  covers_month: number;
  covers_quarter: number;
}
