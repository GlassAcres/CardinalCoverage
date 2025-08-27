-- core
create table if not exists teachers (
  id bigserial primary key,
  name text unique not null,
  dept text,
  room text,
  email text
);

create table if not exists slots (
  id bigserial primary key,
  day_type text check (day_type in ('A','B')) not null,
  period_number int not null,
  unique(day_type, period_number)
);

-- normalized schedule from CSV (NULL = free)
create table if not exists schedule (
  teacher_id bigint references teachers(id) on delete cascade,
  slot_id bigint references slots(id) on delete cascade,
  course_text text,
  primary key (teacher_id, slot_id)
);

-- daily ops
create table if not exists absences (
  id bigserial primary key,
  date date not null,
  day_type text check (day_type in ('A','B')) not null,
  teacher_id bigint references teachers(id),
  reason text
);

create table if not exists coverage_needs (
  id bigserial primary key,
  date date not null,
  slot_id bigint references slots(id),
  absent_teacher_id bigint references teachers(id),
  course_text text
);

create table if not exists coverage_assignments (
  id bigserial primary key,
  date date not null,
  need_id bigint references coverage_needs(id),
  covering_teacher_id bigint references teachers(id),
  assigned_at timestamptz default now(),
  seed text
);

-- helpful indexes
create index if not exists idx_absences_date on absences(date);
create index if not exists idx_cov_needs_date on coverage_needs(date);
create index if not exists idx_cov_assignments_date on coverage_assignments(date);

-- base slots (1–4 for A/B); run once
insert into slots(day_type, period_number)
select x.d, x.p from (
  values ('A',1),('A',2),('A',3),('A',4),
         ('B',1),('B',2),('B',3),('B',4)
) x(d,p)
on conflict do nothing;

-- fast fairness rollups (views)
create or replace view v_teacher_counts as
select
  t.id as teacher_id,
  date_trunc('week', ca.date)::date as week_start,
  date_trunc('month', ca.date)::date as month_start,
  date_trunc('quarter', ca.date)::date as quarter_start,
  count(*) filter (where ca.covering_teacher_id = t.id) as covers_total
from teachers t
left join coverage_assignments ca on ca.covering_teacher_id = t.id
group by t.id, 1,2,3;

-- helpers for ‘today’ lookups if you want:
-- select date_trunc('week', current_date); etc. (standard Postgres) :contentReference[oaicite:2]{index=2}
