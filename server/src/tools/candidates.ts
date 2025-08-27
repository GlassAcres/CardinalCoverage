import { supabaseService } from "./db";
import { DayType, CandidateRow } from "../types";

export async function candidatesForSlot(date: string, day_type: DayType, slot_id: number, excludeTeacherIds: number[]) {
  // Teachers with NULL course_text on this slot are free
  const { data: freeRows, error: fErr } = await supabaseService
    .from("schedule")
    .select("teacher_id, teachers(name)")
    .eq("slot_id", slot_id)
    .is("course_text", null)
    .neq("teacher_id", excludeTeacherIds); // ignore absent
  if (fErr) throw fErr;

  const teacherIds = freeRows!.map(r => r.teacher_id);
  if (teacherIds.length === 0) return [] as CandidateRow[];

  // Count how many free A/B today (0–4)
  const { data: daySlots, error: sErr } = await supabaseService
    .from("slots").select("id").eq("day_type", day_type);
  if (sErr) throw sErr;
  const slotIdsToday = daySlots!.map(s=>s.id);

  const { data: todaysSchedule, error: tsErr } = await supabaseService
    .from("schedule")
    .select("teacher_id, slot_id, course_text")
    .in("teacher_id", teacherIds)
    .in("slot_id", slotIdsToday);
  if (tsErr) throw tsErr;

  const freeCount = new Map<number, number>();
  for (const id of teacherIds) freeCount.set(id, 0);
  for (const row of todaysSchedule!) {
    if (row.course_text == null) {
      freeCount.set(row.teacher_id, (freeCount.get(row.teacher_id)||0)+1);
    }
  }

  // Fairness windows using date_trunc (week, month, quarter) in SQL
  // (we’ll just query counts per teacher on or before date)
  const { data: hist, error: hErr } = await supabaseService.rpc("coverage_counts_for_date", {
    p_date: date
  });
  if (hErr) throw hErr;
  const week = new Map<number, number>(), month = new Map<number, number>(), quarter = new Map<number, number>();
  for (const r of hist as any[]) {
    week.set(r.teacher_id, r.covers_week||0);
    month.set(r.teacher_id, r.covers_month||0);
    quarter.set(r.teacher_id, r.covers_quarter||0);
  }

  return freeRows!.map(r => ({
    teacher_id: r.teacher_id,
    name: (r as any).teachers.name,
    free_today: freeCount.get(r.teacher_id) ?? 0,
    covers_week: week.get(r.teacher_id) ?? 0,
    covers_month: month.get(r.teacher_id) ?? 0,
    covers_quarter: quarter.get(r.teacher_id) ?? 0
  }));
}
