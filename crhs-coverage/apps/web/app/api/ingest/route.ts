import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teachers, schedule, slots } from "@/lib/schema";
import { parseMatrix } from "@/lib/parsing";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File;
  const csv = await file.text();

  const { normalized } = parseMatrix(csv);

  // Map teacher names -> ids
  for (const r of normalized) {
    if (!r.teacher) continue;
    const existing = await db.query.teachers.findFirst({ where: eq(teachers.name, r.teacher) });
    const { id: teacherId } = existing ?? (await db.insert(teachers).values({ name: r.teacher }).returning({ id: teachers.id }))[0];

    for (const s of r.slots) {
      const slot = await db.query.slots.findFirst({ where: (sl) => sl.dayType.eq(s.day as any).and(sl.periodNumber.eq(s.period)) });
      if (!slot) continue;
      await db.insert(schedule)
        .values({ teacherId, slotId: slot.id, courseText: s.value || null })
        .onConflictDoUpdate({ target: [schedule.teacherId, schedule.slotId], set: { courseText: s.value || null } });
    }
  }
  return NextResponse.json({ ok: true });
}
