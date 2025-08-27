import { Agent, run, tool } from "@openai/agents";
import { setDefaultOpenAIKey } from "@openai/agents-openai";
import { db } from "@/lib/db";
import { teachers, slots, schedule, absences, coverageNeeds, coverageAssignments } from "@/lib/schema";
import { score, greedyAssign, hungarianAssign, defaultW, Candidate, Need } from "@/lib/solver";
import { eq, and } from "drizzle-orm";

setDefaultOpenAIKey(process.env.OPENAI_API_KEY!);

// ---- Tools ----
const listNeeds = tool({
  name: "list_needs",
  description: "List coverage needs for a date/day_type. Builds needs from absences + schedule.",
  parameters: {
    type: "object",
    properties: { date: { type:"string" }, dayType: { type:"string", enum:["A","B"] } },
    required: ["date","dayType"]
  },
  execute: async ({ date, dayType }) => {
    const abs = await db.select().from(absences).where(and(absences.date.eq(date), absences.dayType.eq(dayType as any)));
    // build needs for every non-null courseText slot of absent teacher on that day
    const daySlots = await db.select().from(slots).where(slots.dayType.eq(dayType as any));
    const teacherMap = new Map((await db.select().from(teachers)).map(t => [t.id, t]));
    const needs: Need[] = [];
    for (const a of abs) {
      for (const sl of daySlots) {
        const row = await db.select().from(schedule).where(and(schedule.teacherId.eq(a.teacherId), schedule.slotId.eq(sl.id)));
        const ct = row[0]?.courseText;
        if (ct) needs.push({ id: needs.length+1, slotId: sl.id, period: sl.periodNumber!, absentTeacherId: a.teacherId, courseText: ct });
      }
    }
    // persist coverage_needs (idempotent-ish for MVP)
    for (const n of needs) {
      await db.insert(coverageNeeds).values({ date, slotId: n.slotId, absentTeacherId: n.absentTeacherId, courseText: n.courseText }).onConflictDoNothing();
    }
    return { needs };
  }
});

const candidatesForNeed = tool({
  name: "candidates_for_need",
  description: "Return candidates for a need: free at that slot + stats (week/month/quarter)",
  parameters: { type:"object", properties: { needId: { type:"number" }, dayType:{type:"string","enum":["A","B"]}, date:{type:"string"} }, required:["needId","dayType","date"] },
  execute: async ({ needId, dayType, date }) => {
    const need = (await db.select().from(coverageNeeds).where(coverageNeeds.id.eq(needId)))[0];
    const slot = (await db.select().from(slots).where(slots.id.eq(need.slotId)))[0];
    // Free = schedule.courseText IS NULL at same slot
    const freeRows = await db.execute(`
      select t.id, t.name
      from schedule s
      join teachers t on t.id = s.teacher_id
      where s.slot_id = ${need.slotId} and s.course_text is null
    `);
    const cands: Candidate[] = [];
    for (const r of freeRows.rows as any[]) {
      // skip absent teacher + no more than one slot later
      if (r.id === need.absentTeacherId) continue;
      const stats = await db.execute(`
        with d as (
          select date '${date}'::date as d,
                 date_trunc('week', '${date}'::date)::date as wk,
                 date_trunc('month','${date}'::date)::date as mon,
                 date_trunc('quarter','${date}'::date)::date as qtr
        )
        select
          (select count(*) from coverage_assignments ca, d where ca.covering_teacher_id = ${r.id} and ca.date >= d.wk and ca.date <= d.d) as covers_week,
          (select count(*) from coverage_assignments ca, d where ca.covering_teacher_id = ${r.id} and date_trunc('month', ca.date) = d.mon) as covers_month,
          (select count(*) from coverage_assignments ca, d where ca.covering_teacher_id = ${r.id} and date_trunc('quarter', ca.date) = d.qtr) as covers_quarter
      `);
      const freeToday = (await db.execute(`
        select count(*)::int as c from schedule s
        join slots sl on sl.id = s.slot_id
        where s.teacher_id = ${r.id} and sl.day_type='${dayType}' and s.course_text is null
      `)).rows[0].c as number;

      const row = stats.rows[0] as any;
      cands.push({ teacherId: r.id, name: r.name, freeToday, coversWeek: Number(row.covers_week), coversMonth: Number(row.covers_month), coversQuarter: Number(row.covers_quarter) });
    }
    return { candidates: cands };
  }
});

const solvePlan = tool({
  name: "solve_plan",
  description: "Compute assignments for needs using greedy or Hungarian, with seeded random tie-breaks.",
  parameters: {
    type:"object",
    properties:{
      needs: { type:"array", items:{ type:"object" } },
      candMap: { type:"object" },
      method: { type:"string", enum:["greedy","hungarian"], default:"greedy" },
      seed: { type:"string" }
    },
    required:["needs","candMap"]
  },
  execute: async ({ needs, candMap, method, seed }) => {
    const res = method === "hungarian"
      ? hungarianAssign(needs as Need[], candMap as Record<number, Candidate[]>, seed)
      : greedyAssign(needs as Need[], candMap as Record<number, Candidate[]>, seed);
    return res;
  }
});

const commitPlan = tool({
  name: "commit_plan",
  description: "Persist assignments for a date. Enforces one-slot-per-teacher/day by design.",
  parameters: {
    type:"object",
    properties:{ date:{type:"string"}, picks:{ type:"object" }, seed:{type:"string"} },
    required:["date","picks","seed"]
  },
  execute: async ({ date, picks, seed }) => {
    for (const [needId, teacherId] of Object.entries(picks as Record<string, number|null>)) {
      if (!teacherId) continue;
      await db.insert(coverageAssignments).values({
        date, needId: Number(needId), coveringTeacherId: Number(teacherId), seed
      });
    }
    return { ok: true };
  }
});

// ---- The Agent ----
export const plannerAgent = new Agent({
  name: "Coverage Planner",
  instructions: `
You are the CrHS coverage planner. Rules:
- Select only teachers with blank (free) period for that slot.
- One slot per teacher per day.
- Prioritize teachers with the most free periods that day.
- Apply fairness: favor teachers with fewer recent coverages (week > month > quarter).
- Randomize tie-breaks with the provided seed.
Return a JSON summary and a human explanation.`,
  tools: [listNeeds, candidatesForNeed, solvePlan, commitPlan],
});

// Helper to run the full flow in code (deterministic & simple MVP)
export async function plan(date: string, dayType: "A"|"B", seed?: string, method: "greedy"|"hungarian"="greedy") {
  const run1 = await run(plannerAgent, [{ role:"user", content:`Plan coverage for ${date} (${dayType} day). Build needs.` }], { toolChoice: "required", tool: "list_needs", arguments: { date, dayType }});
  const needs = (run1.toolResults?.[0]?.output as any).needs as Need[];

  const candMap: Record<number, Candidate[]> = {};
  for (const n of needs) {
    const r = await run(plannerAgent, [{ role:"user", content:`Candidates for need ${n.id}.` }], { toolChoice:"required", tool:"candidates_for_need", arguments:{ needId: n.id, dayType, date }});
    candMap[n.id] = (r.toolResults?.[0]?.output as any).candidates as Candidate[];
  }

  const run3 = await run(plannerAgent, [{ role:"user", content:`Solve plan with method=${method}.` }], { toolChoice:"required", tool:"solve_plan", arguments:{ needs, candMap, method, seed }});
  const { picks, seed: s } = run3.toolResults?.[0]?.output as any;

  return { needs, candMap, picks, seed: s };
}
