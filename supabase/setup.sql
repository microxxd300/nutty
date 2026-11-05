-- =====================================================================
--  NNN Tracker — Supabase setup
--  Paste this whole file into Supabase → SQL Editor → Run.
--  It is safe to re-run (tables use IF NOT EXISTS, policies are
--  dropped and recreated, functions use CREATE OR REPLACE).
--
--  Security model (there is no backend, so everything lives here):
--    * RLS is enabled on every table.
--    * Clients can only SELECT, plus insert/update their OWN profile.
--    * Every other write goes through SECURITY DEFINER functions:
--        check_in(status)        — server picks today's date
--        check_in_yesterday()    — one-day grace for a missed check-in
--        create_group(group_name) — server makes the invite code, max 5
--        join_group(code)        — lookup by code, max 50 members
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Helper used by a CHECK constraint
-- ---------------------------------------------------------------------

create or replace function public.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;


-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null
                check (display_name ~ '^[A-Za-z0-9_ ]{2,20}$'
                       and display_name = btrim(display_name)),
  -- A Nutty pose. Must match AVATARS in lib/avatars.ts
  avatar        text not null default 'idle'
                check (avatar in ('idle','wave','flex','celebrate','on-fire','meditate','nervous')),
  timezone      text not null default 'UTC'
                check (public.is_valid_timezone(timezone)),
  created_at    timestamptz not null default now()
);

-- Upgrading from the earlier emoji-avatar version of this script?
-- Swap profiles.avatar_emoji for profiles.avatar (everyone starts as 'idle').
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_emoji'
  ) then
    alter table public.profiles drop constraint if exists profiles_avatar_emoji_check;
    alter table public.profiles rename column avatar_emoji to avatar;
    update public.profiles set avatar = 'idle';
    alter table public.profiles alter column avatar set default 'idle';
    alter table public.profiles add constraint profiles_avatar_check
      check (avatar in ('idle','wave','flex','celebrate','on-fire','meditate','nervous'));
  end if;
end $$;

create table if not exists public.groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null
               check (name ~ '^[A-Za-z0-9_ ]{2,30}$' and name = btrim(name)),
  invite_code  text not null unique check (invite_code ~ '^[A-Z0-9]{8}$'),
  created_by   uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_id_idx on public.group_members (user_id);
create index if not exists groups_created_by_idx on public.groups (created_by);

create table if not exists public.checkins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  date        date not null,
  status      text not null check (status in ('ok', 'fell')),
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);


-- ---------------------------------------------------------------------
-- 2. Membership helpers (SECURITY DEFINER so policies don't recurse)
-- ---------------------------------------------------------------------

-- Is the current user a member of this group?
create or replace function public.is_group_member(group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = is_group_member.group_id
      and gm.user_id = auth.uid()
  );
$$;

-- Does the current user share at least one group with other_user?
create or replace function public.shares_group_with(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.user_id = other_user
      and public.is_group_member(gm.group_id)
  );
$$;


-- ---------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.checkins      enable row level security;

-- profiles: read yourself + groupmates; insert/update only yourself
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_group_with(id));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- groups: only groups you're in (no browsing). Writes via create_group().
drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member" on public.groups
  for select to authenticated
  using (public.is_group_member(id));

-- group_members: only memberships of your groups. Writes via functions.
drop policy if exists "group_members_select_member" on public.group_members;
create policy "group_members_select_member" on public.group_members
  for select to authenticated
  using (public.is_group_member(group_id));

-- checkins: yours + groupmates'. Writes only via check_in().
drop policy if exists "checkins_select" on public.checkins;
create policy "checkins_select" on public.checkins
  for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_group_with(user_id));

-- No INSERT/UPDATE/DELETE policies on groups, group_members or checkins,
-- and no DELETE policy anywhere => those operations are denied by RLS.


-- ---------------------------------------------------------------------
-- 4. Table privileges (belt and braces on top of RLS)
-- ---------------------------------------------------------------------

revoke all on public.profiles, public.groups, public.group_members, public.checkins
  from anon, authenticated;

grant select on public.profiles, public.groups, public.group_members, public.checkins
  to authenticated;

-- Profiles: only these columns can be written (not created_at).
grant insert (id, display_name, avatar, timezone) on public.profiles to authenticated;
grant update (display_name, avatar, timezone)     on public.profiles to authenticated;


-- ---------------------------------------------------------------------
-- 5. RPC: check_in(status)
--    The client never sends a date. "Today" is computed here from the
--    user's saved timezone.
-- ---------------------------------------------------------------------

create or replace function public.check_in(status text)
returns public.checkins
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid       uuid := auth.uid();
  tz        text;
  today     date;
  nov1      date;
  nov30     date;
  existing  public.checkins;
  result    public.checkins;
begin
  if uid is null then
    raise exception 'You need to be signed in.';
  end if;

  if check_in.status is null or check_in.status not in ('ok', 'fell') then
    raise exception 'Status must be ok or fell.';
  end if;

  -- Lock the profile row so a double-tap can't race itself.
  select p.timezone into tz from public.profiles p where p.id = uid for update;
  if not found then
    raise exception 'Set up your profile first.';
  end if;

  today := (now() at time zone tz)::date;
  nov1  := make_date(extract(year from today)::int, 11, 1);
  nov30 := nov1 + 29;

  if today < nov1 or today > nov30 then
    raise exception 'Check-ins are only open November 1–30.';
  end if;

  if exists (
    select 1 from public.checkins c
    where c.user_id = uid and c.status = 'fell' and c.date between nov1 and nov30
  ) then
    raise exception 'You already fell this year. Respect for the honesty — see you next November.';
  end if;

  select * into existing from public.checkins c where c.user_id = uid and c.date = today;
  if found then
    -- Honesty path: you checked in "ok" this morning but fell later today.
    -- This is the only change allowed to an existing check-in.
    if existing.status = 'ok' and check_in.status = 'fell' then
      update public.checkins c set status = 'fell' where c.id = existing.id
      returning * into result;
      return result;
    end if;
    raise exception 'You already checked in today. Come back tomorrow.';
  end if;

  insert into public.checkins (user_id, date, status)
  values (uid, today, check_in.status)
  returning * into result;

  return result;
end;
$$;


-- ---------------------------------------------------------------------
-- 6. RPC: check_in_yesterday() — one-day grace for a missed check-in
-- ---------------------------------------------------------------------

create or replace function public.check_in_yesterday()
returns public.checkins
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid       uuid := auth.uid();
  tz        text;
  today     date;
  nov1      date;
  missed    date;
  result    public.checkins;
begin
  if uid is null then
    raise exception 'You need to be signed in.';
  end if;

  -- Use the same profile lock as check_in() so catch-up and today's
  -- check-in cannot race each other.
  select p.timezone into tz from public.profiles p where p.id = uid for update;
  if not found then
    raise exception 'Set up your profile first.';
  end if;

  today := (now() at time zone tz)::date;
  nov1   := make_date(extract(year from today)::int, 11, 1);
  missed := today - 1;

  -- November 2 through December 1 are the only dates on which the
  -- previous day belongs to this year's challenge.
  if today < nov1 + 1 or today > nov1 + 30 then
    raise exception 'Yesterday is not available for a late check-in.';
  end if;

  if exists (
    select 1 from public.checkins c
    where c.user_id = uid and c.date = missed
  ) then
    raise exception 'You already checked in for yesterday.';
  end if;

  if exists (
    select 1 from public.checkins c
    where c.user_id = uid and c.status = 'fell' and c.date <= missed
  ) then
    raise exception 'You had already fallen by yesterday.';
  end if;

  insert into public.checkins (user_id, date, status)
  values (uid, missed, 'ok')
  returning * into result;

  return result;
end;
$$;


-- ---------------------------------------------------------------------
-- 7. RPC: create_group(group_name) — max 5 groups per user
-- ---------------------------------------------------------------------

create or replace function public.create_group(group_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid       uuid := auth.uid();
  clean     text := btrim(coalesce(group_name, ''));
  -- No 0/O/1/I so codes are easy to read out loud.
  alphabet  constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw       bytea;
  new_code  text;
  i         int;
  gid       uuid;
begin
  if uid is null then
    raise exception 'You need to be signed in.';
  end if;

  if clean !~ '^[A-Za-z0-9_ ]{2,30}$' then
    raise exception 'Group name must be 2–30 characters: letters, numbers, spaces, underscores.';
  end if;

  -- Lock the creator's profile row so parallel calls can't beat the cap.
  perform 1 from public.profiles p where p.id = uid for update;
  if not found then
    raise exception 'Set up your profile first.';
  end if;

  if (select count(*) from public.groups g where g.created_by = uid) >= 5 then
    raise exception 'You can only create 5 groups.';
  end if;

  loop
    -- 8 random characters from gen_random_uuid() bytes (the bytes we
    -- use are fully random; 256 % 32 = 0 so there is no bias).
    raw := uuid_send(gen_random_uuid());
    new_code := '';
    foreach i in array array[0, 1, 2, 3, 4, 5, 10, 11] loop
      new_code := new_code || substr(alphabet, (get_byte(raw, i) % 32) + 1, 1);
    end loop;

    begin
      insert into public.groups (name, invite_code, created_by)
      values (clean, new_code, uid)
      returning id into gid;
      exit;
    exception when unique_violation then
      -- Code collision (about 1 in a trillion) — try again.
    end;
  end loop;

  insert into public.group_members (group_id, user_id) values (gid, uid);
  return gid;
end;
$$;


-- ---------------------------------------------------------------------
-- 8. RPC: join_group(code) — max 50 members per group
-- ---------------------------------------------------------------------

create or replace function public.join_group(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid           uuid := auth.uid();
  gid           uuid;
  member_count  int;
begin
  if uid is null then
    raise exception 'You need to be signed in.';
  end if;

  if not exists (select 1 from public.profiles p where p.id = uid) then
    raise exception 'Set up your profile first.';
  end if;

  -- Lock the group row so concurrent joins can't exceed the cap.
  select g.id into gid
  from public.groups g
  where g.invite_code = upper(btrim(coalesce(code, '')))
  for update;

  if gid is null then
    raise exception 'No group found with that code.';
  end if;

  if exists (select 1 from public.group_members gm where gm.group_id = gid and gm.user_id = uid) then
    return gid; -- already in, nothing to do
  end if;

  select count(*) into member_count from public.group_members gm where gm.group_id = gid;
  if member_count >= 50 then
    raise exception 'This group is full (50 members max).';
  end if;

  insert into public.group_members (group_id, user_id) values (gid, uid);
  return gid;
end;
$$;


-- ---------------------------------------------------------------------
-- 9. Function privileges — signed-in users only
-- ---------------------------------------------------------------------

revoke execute on function
  public.is_valid_timezone(text),
  public.is_group_member(uuid),
  public.shares_group_with(uuid),
  public.check_in(text),
  public.check_in_yesterday(),
  public.create_group(text),
  public.join_group(text)
from public, anon;

grant execute on function
  public.is_valid_timezone(text),
  public.is_group_member(uuid),
  public.shares_group_with(uuid),
  public.check_in(text),
  public.check_in_yesterday(),
  public.create_group(text),
  public.join_group(text)
to authenticated;
