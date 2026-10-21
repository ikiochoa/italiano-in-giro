-- Italiano in giro: the weekly race, progress side by side, and the teacher's weekly challenge.

-- ---------- progress per level, shared with group mates ----------
-- Each person's app works out how far along each CILS level they are (the same score that moves them up)
-- and saves it here, so group mates can compare without downloading each other's word-by-word progress.
-- { lv: { A1: 0.42, ... }, known: 120, up: { level: "A2", at: "2026-10-21T10:00:00Z" } }
alter table public.profiles add column stats jsonb not null default '{}'::jsonb;
grant update (stats) on public.profiles to authenticated;

-- a finished session is worth at most a few hundred points; this keeps a broken client from flooding the race
alter table public.sessions add constraint sessions_points_range check (points between 0 and 2000);

-- ---------- the race: points per member of a group in a time window ----------
-- `since` / `until` are the start of the week in the caller's time zone (the app sends them).
-- `list`: also count how far each member is with that word list (the teacher's challenge list).
create or replace function public.group_week(g uuid, since timestamptz, until timestamptz default null, list text default null)
returns table (user_id uuid, points int, sessions int, answered int, correct int, days int, list_started int, list_known int)
language sql stable security definer set search_path = public as $$
  select m.user_id,
         coalesce(s.pts, 0)::int, coalesce(s.n, 0)::int, coalesce(s.ans, 0)::int, coalesce(s.ok, 0)::int, coalesce(s.days, 0)::int,
         coalesce(p.started, 0)::int, coalesce(p.known, 0)::int
  from group_members m
  left join lateral (
    select sum(x.points) pts, count(*) n, sum(x.answered) ans, sum(x.correct) ok,
           count(distinct floor(extract(epoch from x.ended_at - since) / 86400)) days
    from sessions x
    where x.user_id = m.user_id and x.ended_at >= since and (until is null or x.ended_at < until)
  ) s on true
  left join lateral (
    select count(*) filter (where y.box >= 1) started, count(*) filter (where y.box >= 3) known
    from progress y
    where list is not null and y.user_id = m.user_id
      and y.word_id like replace(replace(replace(list, '\', '\\'), '%', '\%'), '_', '\_') || ':%'
  ) p on true
  where m.group_id = g and public.in_group(g)
$$;
revoke execute on function public.group_week(uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.group_week(uuid, timestamptz, timestamptz, text) to authenticated;

-- ---------- the teacher's weekly challenge ----------
create table public.challenges (
  group_id   uuid not null references public.groups on delete cascade,
  week       date not null,                  -- the Monday the week starts
  title      text not null check (length(title) between 1 and 120),
  target     int not null default 300 check (target between 10 and 100000),   -- points each student should reach
  list_id    text references public.lists on delete set null,               -- optional: a word list to learn
  created_at timestamptz not null default now(),
  primary key (group_id, week)
);
alter table public.challenges enable row level security;
create policy "members read their group's challenges" on public.challenges
  for select to authenticated using (public.in_group(group_id));
create policy "teacher sets the challenge" on public.challenges
  for insert to authenticated with check (public.teaches(group_id));
create policy "teacher changes the challenge" on public.challenges
  for update to authenticated using (public.teaches(group_id)) with check (public.teaches(group_id));
create policy "teacher removes the challenge" on public.challenges
  for delete to authenticated using (public.teaches(group_id));
