import { pgEnum, pgTable, serial, text, integer, date, timestamp, boolean, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";

export const dayTypeEnum = pgEnum("day_type", ["A","B"]);

export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  dept: text("dept"),
  room: text("room"),
  email: text("email"),
});

export const slots = pgTable("slots", {
  id: serial("id").primaryKey(),
  dayType: dayTypeEnum("day_type").notNull(),
  periodNumber: integer("period_number").notNull(), // 1..4
}, (t) => ({
  uniq: uniqueIndex("slots_unique").on(t.dayType, t.periodNumber)
}));

export const schedule = pgTable("schedule", {
  teacherId: integer("teacher_id").notNull().references(() => teachers.id),
  slotId: integer("slot_id").notNull().references(() => slots.id),
  courseText: text("course_text"), // NULL = free period
}, (t) => ({
  pk: primaryKey({ columns: [t.teacherId, t.slotId] }),
}));

export const absences = pgTable("absences", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  dayType: dayTypeEnum("day_type").notNull(),
  teacherId: integer("teacher_id").notNull().references(() => teachers.id),
  reason: text("reason"),
});

export const coverageNeeds = pgTable("coverage_needs", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  slotId: integer("slot_id").notNull().references(() => slots.id),
  absentTeacherId: integer("absent_teacher_id").notNull().references(() => teachers.id),
  courseText: text("course_text"),
});

export const coverageAssignments = pgTable("coverage_assignments", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  needId: integer("need_id").notNull().references(() => coverageNeeds.id),
  coveringTeacherId: integer("covering_teacher_id").notNull().references(() => teachers.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow(),
  seed: text("seed"),
});
