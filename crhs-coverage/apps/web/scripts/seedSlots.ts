import { db } from "../lib/db";
import { slots } from "../lib/schema";
import { eq } from "drizzle-orm";

const rows = ["A","B"].flatMap(d => [1,2,3,4].map(p => ({ dayType: d, periodNumber: p })));

for (const r of rows) {
  const exists = await db.query.slots.findFirst({ where: eq(slots.dayType, r.dayType as any) && eq(slots.periodNumber, r.periodNumber) });
  if (!exists) await db.insert(slots).values(r);
}
console.log("Seeded slots.");
