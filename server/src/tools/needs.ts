import { supabaseService } from "./db";
import { DayType } from "../types";

export async function createNeeds(date: string, day_type: DayType, absentTeacherIds: number[]) {
  // Create coverage_needs for each absent teacher’s non-free slots that match day_type.
  // 1) find slot_ids for the day
  const { data: daySlots, error: sErr } = await supabaseService
    .from("slots").select("id, day_type").eq("day_type", day_type);
  if (sErr) throw sErr;
  const slotIds = daySlots!.map(s=>s.id);

  // 2) schedule rows where course_text is NOT NULL for absent teachers on those slots
  const { data: teachRows, error: rErr } = await supabaseService
    .from("schedule")
    .select("teacher_id, slot_id, course_text")
    .in("teacher_id", absentTeacherIds)
    .in("slot_id", slotIds)
    .not("course_text", "is", null);
  if (rErr) throw rErr;

  const needs = teachRows!.map(r => ({
    date, slot_id: r.slot_id, absent_teacher_id: r.teacher_id, course_text: r.course_text
  }));
  const { data, error } = await supabaseService.from("coverage_needs")
    .insert(needs).select("id");
  if (error) throw error;
  return data!;
}
