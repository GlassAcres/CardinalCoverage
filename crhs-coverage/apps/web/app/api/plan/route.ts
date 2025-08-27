import { NextRequest, NextResponse } from "next/server";
import { plan } from "@/agents/singleAgent";

export async function POST(req: NextRequest) {
  const { date, dayType, seed, method } = await req.json();
  const result = await plan(date, dayType, seed, method);
  return NextResponse.json(result);
}
