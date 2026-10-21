-- Italiano in giro: accounts, groups (one teacher + students), word lists and progress.
-- Everyone reads and writes their own rows. People in the same group can see each other's
-- profile, progress and sessions (for the weekly race); the teacher also sees answers.

-- ---------- profiles ----------
create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  level        text not null default 'A1' check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  settings     jsonb not null default '{}'::jsonb,   -- { lang: "en"|"es", auto: bool }
  best         jsonb not null default '{}'::jsonb,   -- best game scores
  streak_n     int not null default 0,
  streak_last  int not null default -1,              -- local day number of the last completed session
  last_seen    timestamptz,
  created_at   timestamptz not null default now()
);

-- Google sign-in fills full_name / avatar_url in the user metadata
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id, new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- groups: a teacher and their students ----------
create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  teacher_id uuid not null references public.profiles on delete cascade,
  join_code  text not null unique,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups on delete cascade,
  user_id   uuid not null references public.profiles on delete cascade,
  role      text not null default 'student' check (role in ('teacher', 'student')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user on public.group_members (user_id);

-- helpers (security definer so policies can use them without recursing into group_members' own policy)
create or replace function public.in_group(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and user_id = auth.uid())
$$;
create or replace function public.teaches(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from groups where id = g and teacher_id = auth.uid())
$$;
-- true when the signed-in person and `other` are in at least one group together
create or replace function public.shares_group(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members a join group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;
-- true when the signed-in person teaches a group `other` is in
create or replace function public.teaches_user(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from groups g join group_members m on m.group_id = g.id
    where g.teacher_id = auth.uid() and m.user_id = other
  )
$$;

alter table public.groups enable row level security;
create policy "members read their groups" on public.groups
  for select to authenticated using (public.in_group(id));
create policy "teacher renames group" on public.groups
  for update to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "teacher deletes group" on public.groups
  for delete to authenticated using (teacher_id = auth.uid());
-- groups are created and joined through create_group() / join_group() below
revoke insert on public.groups from authenticated, anon;
revoke update on public.groups from authenticated, anon;
grant update (name) on public.groups to authenticated;

alter table public.group_members enable row level security;
create policy "members see each other" on public.group_members
  for select to authenticated using (public.in_group(group_id));
create policy "leave a group, or teacher removes a student" on public.group_members
  for delete to authenticated using ((user_id = auth.uid() and role = 'student') or public.teaches(group_id));
revoke insert, update on public.group_members from authenticated, anon;

create or replace function public.create_group(group_name text) returns public.groups
language plpgsql security definer set search_path = public as $$
declare g groups; code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if coalesce(trim(group_name), '') = '' then raise exception 'name required'; end if;
  loop
    -- 6 letters/digits, without look-alikes (0/O, 1/I/L)
    code := (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from groups where join_code = code);
  end loop;
  insert into groups (name, teacher_id, join_code) values (trim(group_name), auth.uid(), code) returning * into g;
  insert into group_members (group_id, user_id, role) values (g.id, auth.uid(), 'teacher');
  return g;
end $$;

create or replace function public.join_group(code text) returns public.groups
language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into g from groups where join_code = upper(trim(code));
  if not found then raise exception 'no_such_group'; end if;
  insert into group_members (group_id, user_id, role) values (g.id, auth.uid(), 'student')
    on conflict (group_id, user_id) do nothing;
  return g;
end $$;

revoke execute on function public.create_group(text), public.join_group(text) from public, anon;
grant execute on function public.create_group(text), public.join_group(text) to authenticated;

-- profiles policies (after the helpers exist)
alter table public.profiles enable row level security;
create policy "read own profile and group mates" on public.profiles
  for select to authenticated using (id = auth.uid() or public.shares_group(id));
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (display_name, level, settings, best, streak_n, streak_last, last_seen) on public.profiles to authenticated;

-- ---------- lists: vocabulary or verbs a person adds, or a teacher gives to a group ----------
-- Built-in CILS level lists ship with the website; this table holds the ones people add.
create table public.lists (
  id         text primary key,
  owner_id   uuid not null default auth.uid() references public.profiles on delete cascade,
  group_id   uuid references public.groups on delete cascade,   -- set: shared with the whole group
  kind       text not null default 'vocab' check (kind in ('vocab', 'verbs')),
  title      text not null,
  level      text check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  topic      text,
  words      jsonb not null default '[]'::jsonb,   -- vocab: [{ it, g, pl, en, es, e }]  verbs: [{ it, en, es }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lists_owner on public.lists (owner_id, created_at);
create index lists_group on public.lists (group_id) where group_id is not null;
alter table public.lists enable row level security;
create policy "read own and group lists" on public.lists
  for select to authenticated using (owner_id = auth.uid() or (group_id is not null and public.in_group(group_id)));
-- anyone can add a private list; only the group's teacher can share one with the group
create policy "add own lists" on public.lists
  for insert to authenticated with check (owner_id = auth.uid() and (group_id is null or public.teaches(group_id)));
create policy "update own lists" on public.lists
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and (group_id is null or public.teaches(group_id)));
create policy "delete own lists" on public.lists
  for delete to authenticated using (owner_id = auth.uid());

-- ---------- progress: one row per person and word (spaced repetition box) ----------
create table public.progress (
  user_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  word_id    text not null,
  box        smallint not null default 0,
  due        int not null default 0,
  ok         int not null default 0,
  ko         int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id)
);
alter table public.progress enable row level security;
create policy "read own progress and group mates'" on public.progress
  for select to authenticated using (user_id = auth.uid() or public.shares_group(user_id));
create policy "write own progress" on public.progress
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own progress" on public.progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own progress" on public.progress
  for delete to authenticated using (user_id = auth.uid());

-- ---------- answers: every answer given (accuracy and hardest words; the teacher can see them) ----------
create table public.answers (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  word_id    text not null,
  correct    boolean not null,
  kind       text,
  created_at timestamptz not null default now()
);
create index answers_user_time on public.answers (user_id, created_at desc);
alter table public.answers enable row level security;
create policy "read own answers, teachers read their students'" on public.answers
  for select to authenticated using (user_id = auth.uid() or public.teaches_user(user_id));
create policy "add own answers" on public.answers
  for insert to authenticated with check (user_id = auth.uid());

-- ---------- sessions: one row per finished practice or game (points for the weekly race) ----------
create table public.sessions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  kind       text not null,          -- review | list | verbs | match | ...
  list_id    text,
  started_at timestamptz not null,
  ended_at   timestamptz not null default now(),
  answered   int not null default 0,
  correct    int not null default 0,
  points     int not null default 0
);
create index sessions_user_time on public.sessions (user_id, ended_at desc);
alter table public.sessions enable row level security;
create policy "read own sessions and group mates'" on public.sessions
  for select to authenticated using (user_id = auth.uid() or public.shares_group(user_id));
create policy "add own sessions" on public.sessions
  for insert to authenticated with check (user_id = auth.uid());
