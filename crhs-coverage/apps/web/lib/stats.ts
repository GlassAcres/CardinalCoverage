import { db } from "./db";
import { coverageAssignments, schedule, slots, teachers } from "./schema";
import { sql } from "drizzle-orm";

export async function countsForTeacher(teacherId: number, dateISO: string) {
  return db.execute(sql`
    with d as (
      select
        date ${sql.raw(`'${dateISO}'`)}::date as d,
        date_trunc('week', ${sql.raw(`'${dateISO}'`)}::date)::date as wk,
        date_trunc('month', ${sql.raw(`'${dateISO}'`)}::date)::date as mon,
        date_trunc('quarter', ${sql.raw(`'${dateISO}'`)}::date)::date as qtr
    )
    select
      (select count(*) from ${coverageAssignments} ca, d where ca.covering_teacher_id = ${teacherId} and ca.date >= d.wk and ca.date <= d.d) as covers_week,
      (select count(*) from ${coverageAssignments} ca, d where ca.covering_teacher_id = ${teacherId} and date_trunc('month', ca.date) = d.mon) as covers_month,
      (select count(*) from ${coverageAssignments} ca, d where ca.covering_teacher_id = ${teacherId} and date_trunc('quarter', ca.date) = d.qtr) as covers_quarter
  `);
}

export async function freeCountADay(teacherId: number, dayType: "A"|"B") {
  // free = NULL courseText across 1..4 of the given day
  const rows = await db.select({ cnt: sql<number>`count(*)` })
    .from(schedule)
    .innerJoin(slots, (s, sl) => s.slotId.eq(sl.id))
    .where(schedule.teacherId.eq(teacherId).and(slots.dayType.eq(dayType)).and(schedule.courseText.isNull()));
  return Number(rows[0]?.cnt ?? 0);
}
