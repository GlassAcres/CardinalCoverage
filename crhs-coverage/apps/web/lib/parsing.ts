import { parse } from "csv-parse/sync";

export type RawRow = Record<string, string | undefined>;

export function parseMatrix(csv: string) {
  const rows = parse(csv, { columns: true, skip_empty_lines: true }) as RawRow[];
  // Identify schedule headers like "1A","2A","1B","4B"
  const headers = Object.keys(rows[0] || {});
  const slotHeaders = headers.filter(h => /^\s*\d+\s*[ABab]\s*$/.test(h));
  const teacherCol = headers.find(h => /teacher/i.test(h)) ?? headers[0];

  // Normalize to [{teacher, slotKey:'1A', value:'Algebra'|''}]
  const normalized = rows.map(r => {
    const teacher = (r[teacherCol] || "").trim();
    const slots = slotHeaders.map(h => ({
      header: h,
      period: Number(h.replace(/[^0-9]/g,'')),
      day: h.toUpperCase().includes("A") ? "A" : "B",
      value: (r[h] || "").trim()
    }));
    return { teacher, slots };
  });

  return { teacherCol, slotHeaders, normalized };
}
