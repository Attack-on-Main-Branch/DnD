-- Characters owned by a user. Run this in the Supabase dashboard:
-- SQL Editor → New query → paste → Run. Safe to run more than once.

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- 'dm' is reserved for the Dungeon Master flow, which is not built yet.
  kind text not null default 'player' check (kind in ('player', 'dm')),

  name text not null check (char_length(name) between 2 and 40),

  -- The four-digit tag shown as Name#0451.
  discriminator text not null check (discriminator ~ '^[0-9]{4}$'),

  race text not null,
  alignment text not null check (alignment in (
    'lawful_good',    'neutral_good',    'chaotic_good',
    'lawful_neutral', 'true_neutral',    'chaotic_neutral',
    'lawful_evil',    'neutral_evil',    'chaotic_evil'
  )),

  backstory text not null default '' check (char_length(backstory) <= 2000),
  personality text not null default '' check (char_length(personality) <= 2000),

  created_at timestamptz not null default now()
);

-- name + #tag is how a DM will look a character up when inviting it to a
-- party, so the pair has to identify exactly one row. Case-insensitive:
-- nobody should have to remember whether it was Gandalf or gandalf.
create unique index if not exists characters_handle_key
  on public.characters (lower(name), discriminator);

create index if not exists characters_user_id_idx
  on public.characters (user_id);

alter table public.characters enable row level security;

-- Wrapping auth.uid() in a scalar subquery lets Postgres evaluate it once per
-- statement instead of once per row — Supabase's recommended RLS pattern.
drop policy if exists "Users read their own characters" on public.characters;
create policy "Users read their own characters"
  on public.characters for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own characters" on public.characters;
create policy "Users create their own characters"
  on public.characters for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own characters" on public.characters;
create policy "Users delete their own characters"
  on public.characters for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Three characters per account, enforced in the database. The Server Action
-- does not pre-count, and should not: it sits behind an API anyone can call
-- directly, so a check up there could never be the thing that holds.
--
-- Note what THIS version does not do. The count below takes no lock, so under
-- READ COMMITTED two requests arriving together both read the same pre-state
-- and both insert. That race is real; it is closed in
-- 20260814215246_race_check_and_limit_lock.sql, which replaces this function
-- with one that takes a per-user advisory lock first.
--
-- The exception is translated on the way out, in two steps rather than one:
-- Sina/src/data/characters.js matches 'character_limit_reached' and returns the
-- reason code 'limit_reached', and the Server Action maps that code onto the
-- MAX_CHARACTERS sentence the user reads. Backend says why, frontend says it.
create or replace function public.enforce_character_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.characters where user_id = new.user_id) >= 3 then
    raise exception 'character_limit_reached';
  end if;

  return new;
end;
$$;

create or replace trigger characters_enforce_limit
  before insert on public.characters
  for each row execute function public.enforce_character_limit();
