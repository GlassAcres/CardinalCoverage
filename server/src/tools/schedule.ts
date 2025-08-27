import { supabaseService } from "./db";
import { parse } from "csv-parse/sync";

const SLOT_HEADERS = ["1A","2A","3A","4A","1B","2B","3B","4B"];

export async function ingestScheduleCsv(csvText: string) {
  const records = parse(csvText, { columns: true, skip_empty_lines: true });
  // upsert teachers
  const teacherIdByName = new Map<string, number>();
  for (const r of records) {
    const name = (r["Teacher"]||"").trim();
    if (!name) continue;
    if (!teacherIdByName.has(name)) {
      const { data, error } = await supabaseService
        .from("teachers")
        .upsert({ name }, { onConflict: "name" })
        .select("id")
        .single();
      if (error) throw error;
      teacherIdByName.set(name, data!.id);
    }
  }

  // map headers -> slot_id
  const { data: slots, error: slotErr } = await supabaseService
    .from("slots").select("id, day_type, period_number");
  if (slotErr) throw slotErr;

  const slotIdByHeader: Record<string, number> = {};
  for (const h of SLOT_HEADERS) {
    const day_type = h.endsWith("A") ? "A" : "B";
    const period_number = parseInt(h[0], 10);
    const slot = slots!.find(s => s.day_type === day_type && s.period_number === period_number);
    if (slot) slotIdByHeader[h] = slot.id;
  }

  // build rows
  const scheduleRows: { teacher_id: number; slot_id: number; course_text: string|null }[] = [];
  for (const r of records) {
    const name = (r["Teacher"]||"").trim();
    if (!name) continue;
    const teacher_id = teacherIdByName.get(name)!;
    for (const h of SLOT_HEADERS) {
      if (!(h in r)) continue;
      const val = typeof r[h] === "string" ? r[h].trim() : r[h];
      scheduleRows.push({
        teacher_id, slot_id: slotIdByHeader[h], course_text: val ? String(val) : null
      });
    }
  }

  // upsert schedule
  const chunkSize = 1000;
  for (let i=0;i<scheduleRows.length;i+=chunkSize) {
    const chunk = scheduleRows.slice(i, i+chunkSize);
    const { error } = await supabaseService.from("schedule")
      .upsert(chunk, { onConflict: "teacher_id,slot_id" });
    if (error) throw error;
  }
  return { teachers: teacherIdByName.size, rows: scheduleRows.length };
}
