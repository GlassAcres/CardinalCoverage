import { Agent, tool } from "@openai/agents"; // Agents, Tools, Handoffs :contentReference[oaicite:7]{index=7}
import { ingestScheduleCsv } from "../tools/schedule";
import { createNeeds } from "../tools/needs";
import { candidatesForSlot } from "../tools/candidates";
import { solveGreedy, solveHungarian } from "../tools/solver";
import { humanExplain } from "../tools/explain";
import { supabaseService } from "../tools/db";
import type { DayType, Need, CandidateRow } from "../types";

export const coverageAgent = new Agent({
  name: "Coverage Planner",
  model: "gpt-5.1", // pick your model
  instructions:
`You are the CrHS coverage planner. Rules:
- One slot per covering teacher per date.
- Prioritize teachers with the MOST free periods today (A or B day).
- Fairness penalty for teachers who covered a lot this week, month, quarter.
- Randomize ties; if a 'seed' is provided, produce deterministic results.
Return concise JSON unless asked for prose.`,
  tools: [
    tool({
      name: "ingest_schedule_csv",
      description: "Parse schedule CSV and upsert teachers/schedule.",
      parameters: { type:"object", properties:{ csvText:{type:"string"} }, required:["csvText"] },
      execute: async ({ csvText }) => ingestScheduleCsv(csvText)
    }),
    tool({
      name: "create_needs",
      description: "Create coverage needs for a date + day_type from absent teacher ids.",
      parameters: { type:"object", properties:{
          date:{type:"string"}, day_type:{type:"string", enum:["A","B"]},
          absent_teacher_ids:{type:"array", items:{type:"number"}}
        }, required:["date","day_type","absent_teacher_ids"]
      },
      execute: async ({ date, day_type, absent_teacher_ids }) =>
        createNeeds(date, day_type as DayType, absent_teacher_ids)
    }),
    tool({
      name: "list_candidates_for_need",
      description: "List candidate teachers for a need id using schedule and fairness windows.",
      parameters: { type:"object", properties:{
        date:{type:"string"}, day_type:{type:"string", enum:["A","B"]}, need_id:{type:"number"},
        exclude_teacher_ids:{type:"array", items:{type:"number"}}
      }, required:["date","day_type","need_id","exclude_teacher_ids"] },
      execute: async ({ date, day_type, need_id, exclude_teacher_ids }) => {
        const { data: need } = await supabaseService.from("coverage_needs")
          .select("id, slot_id, absent_teacher_id, date").eq("id", need_id).single();
        return candidatesForSlot(date, day_type as DayType, need!.slot_id, exclude_teacher_ids);
      }
    }),
    tool({
      name: "solve_plan",
      description: "Solve plan using greedy or hungarian; returns assignments map {need_id: teacher_id|null}.",
      parameters: { type:"object", properties:{
        strategy:{type:"string", enum:["greedy","hungarian"]},
        needs:{ type:"array", items:{type:"object"} },
        cand_map:{ type:"object" },
        seed:{ type:"string" }
      }, required:["strategy","needs","cand_map"] },
      execute: async ({ strategy, needs, cand_map, seed }) => {
        const needsArr = needs as Need[];
        const map = new Map<number, CandidateRow[]>(Object.entries(cand_map).map(([k,v])=>[Number(k), v as CandidateRow[]]));
        const out = strategy === "hungarian"
          ? solveHungarian(needsArr, map, seed)
          : solveGreedy(needsArr, map, seed);
        return out;
      }
    }),
    tool({
      name: "commit_plan",
      description: "Commit assignments for date with seed.",
      parameters: { type:"object", properties:{
        date:{type:"string"},
        assignments:{type:"object"},
        seed:{type:"string"}
      }, required:["date","assignments"] },
      execute: async ({ date, assignments, seed }) => {
        const rows = Object.entries(assignments).filter(([,v])=>v)
          .map(([need_id, covering_teacher_id])=>({ date, need_id: Number(need_id), covering_teacher_id: Number(covering_teacher_id), seed }));
        if (rows.length) {
          const { error } = await supabaseService.from("coverage_assignments").insert(rows);
          if (error) throw error;
        }
        return { inserted: rows.length };
      }
    }),
    tool({
      name: "explain_plan",
      description: "Human-readable explanation for assignments.",
      parameters: { type:"object", properties:{
        needs:{type:"array", items:{type:"object"}},
        assignments:{type:"object"},
        cand_map:{type:"object"}
      }, required:["needs","assignments","cand_map"] },
      execute: async ({ needs, assignments, cand_map }) =>
        humanExplain(needs as Need[],
                     assignments as Record<number,number|null>,
                     new Map<number, CandidateRow[]>(Object.entries(cand_map).map(([k,v])=>[Number(k), v as CandidateRow[]])))
    })
  ]
});
