import { NextRequest, NextResponse } from "next/server";
import { run } from "@openai/agents";
import { plannerAgent } from "@/agents/singleAgent";

export async function POST(req: NextRequest) {
  const { date, picks, seed } = await req.json();
  const r = await run(plannerAgent, [{ role:"user", content:"Commit plan" }], {
    toolChoice:"required", tool:"commit_plan", arguments:{ date, picks, seed }
  });
  return NextResponse.json(r.toolResults?.[0]?.output ?? { ok:true });
}
