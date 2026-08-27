-- Features and feats: the things a character can do that no column describes.
--
-- Darkvision, War Caster, a boon somebody was handed for saving a village. Two
-- fields — a name and what it does — because everything else 5e attaches to a
-- feat is a thing this app could not enforce, and a form asking questions
-- nobody can answer is worse than one that does not ask.
--
-- WRITTEN BY TWO PEOPLE AND READ BY THE TABLE. The character's owner writes
-- their own from the sheet; the Dungeon Master writes them onto anybody at
-- their own table from the Create tab. Both are ordinary policies rather than
-- definer functions, because every column here is one the writer may set —
-- compare `set_character_health`, where the row is shared and a policy wide
-- enough to admit the hit points would admit the backstory beside them.
--
-- Mirrors Sina/src/rules/features.js.

create table if not exists public.character_features (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,

  name text not null,
  description text not null,

  created_at timestamptz not null default now()
);

-- Mirrors MAX_FEATURE_NAME_LENGTH and MAX_FEATURE_DESCRIPTION_LENGTH.
-- `char_length` counts code points, which is what `countCharacters` counts —
-- JS `.length` counts UTF-16 units and would let an emoji-heavy name past here.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'character_features_name_check'
  ) then
    alter table public.character_features
      add constraint character_features_name_check
      check (char_length(btrim(name)) between 1 and 80);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'character_features_description_check'
  ) then
    alter table public.character_features
      add constraint character_features_description_check
      check (char_length(btrim(description)) between 1 and 1000);
  end if;
end;
$$;

-- Every read is "this character's features, oldest first", which is this index.
create index if not exists character_features_character_id_created_at_idx
  on public.character_features (character_id, created_at);

-- ---------------------------------------------------------------------------
-- Forty to a character.
-- ---------------------------------------------------------------------------
--
-- `enforce_campaign_item_limit`'s shape, including the two things that one
-- learned the hard way: the advisory lock, without which two requests arriving
-- together both read the same pre-state; and `auth.uid() is not null` rather
-- than `is distinct from`, which would turn the guard off for an anonymous
-- caller instead of on. Mirrors MAX_CHARACTER_FEATURES.
create or replace function public.enforce_feature_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.character_id::text, 0));

  if (
    select count(*) from public.character_features f
    where f.character_id = new.character_id
  ) >= 40 then
    raise exception 'feature_limit_reached';
  end if;

  return new;
end;
$fn$;

revoke all on function public.enforce_feature_limit() from public;
revoke all on function public.enforce_feature_limit() from anon;
revoke all on function public.enforce_feature_limit() from authenticated;

drop trigger if exists character_features_enforce_limit on public.character_features;
create trigger character_features_enforce_limit
  before insert on public.character_features
  for each row
  execute function public.enforce_feature_limit();

-- ---------------------------------------------------------------------------
-- Who reads one, and who writes one.
-- ---------------------------------------------------------------------------
--
-- READ BY THE WHOLE TABLE. A feature is not a secret the way a note is: it is
-- what a character can do, and the party finds that out the first time they do
-- it. `my_character_in_campaign` is what lets a player read a teammate's.
--
-- WRITTEN BY THE OWNER OR THE DUNGEON MASTER OF A TABLE THEY PLAY AT, which is
-- `may_move_character`'s question — the same one damage and an armour class are
-- asked. It takes a campaign, and a policy has none to hand, so the two halves
-- are written out: `owns_character`, or a campaign this account owns that this
-- character is a member of.
--
-- Cross-table questions go through the `security definer` helpers from
-- 20260818160000 rather than an inline `exists` over an RLS-protected table —
-- policies that read each other's tables recurse, and one such cycle took down
-- every read of `characters` once already.
alter table public.character_features enable row level security;

drop policy if exists "The table reads what a character can do" on public.character_features;
create policy "The table reads what a character can do"
  on public.character_features for select to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.campaign_members m
      where m.character_id = character_features.character_id
        and (
          public.owns_campaign(m.campaign_id)
          or public.my_character_in_campaign(m.campaign_id)
        )
    )
  );

drop policy if exists "Owners and their DM write a feature" on public.character_features;
create policy "Owners and their DM write a feature"
  on public.character_features for insert to authenticated
  with check (
    public.owns_character(character_id)
    or exists (
      select 1 from public.campaign_members m
      where m.character_id = character_features.character_id
        and public.owns_campaign(m.campaign_id)
    )
  );

drop policy if exists "Owners and their DM strike one out" on public.character_features;
create policy "Owners and their DM strike one out"
  on public.character_features for delete to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.campaign_members m
      where m.character_id = character_features.character_id
        and public.owns_campaign(m.campaign_id)
    )
  );

-- NO UPDATE POLICY. A feature is written down or struck out; there is nothing
-- in between, and the sheet offers no pencil. It comes back in the migration
-- that adds one — the same promise 20260821140000 made about a note, and kept.

-- ---------------------------------------------------------------------------
-- On the wire.
-- ---------------------------------------------------------------------------
--
-- `replica identity full`, for the reason `campaign_marks` carries one:
-- Realtime evaluates the SELECT policy against the row it is given, and a
-- DELETE carrying only `id` has no `character_id` for that policy to read — so
-- a struck-out feature would stay on everybody else's screen until they
-- reloaded.
alter table public.character_features replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'character_features'
  ) then
    alter publication supabase_realtime add table public.character_features;
  end if;
end;
$$;
