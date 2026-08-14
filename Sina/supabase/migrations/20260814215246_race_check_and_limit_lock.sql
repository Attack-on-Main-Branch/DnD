-- Two gaps an audit turned up in the characters table.
--
-- 1. `race` was the only enumerated column with no CHECK. `kind`, `alignment`,
--    `color_theme`, `level` and the `(archetype, class_id)` pair all have one;
--    race was enforced by validateCharacter alone. The RLS insert policy
--    authorises a row on `auth.uid() = user_id` and says nothing about column
--    values, so the database would have accepted any string of any length.
--
-- 2. The three-per-account trigger counted without taking a lock. Under READ
--    COMMITTED a plain COUNT does not see rows inserted by a concurrent
--    uncommitted transaction, so two requests arriving together both read 2
--    and both insert, leaving four.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_race_check'
  ) then
    -- Mirrors RACES in Sina/src/rules/character.js. Adding to that list means
    -- adding a migration here, the same pairing color_theme already has.
    alter table public.characters
      add constraint characters_race_check check (race in (
        'Human', 'Dragonborn', 'Dwarf', 'Elf', 'Gnome',
        'Half-Elf', 'Half-Orc', 'Halfling', 'Tiefling'
      ));
  end if;
end
$$;

-- Serialised per user by a transaction-scoped advisory lock: concurrent
-- inserts for the same account queue behind each other instead of all reading
-- the same pre-state, and the lock is released at commit or rollback either
-- way. Keyed on the user id, so unrelated accounts never contend.
--
-- Both `pg_advisory_xact_lock` and `hashtextextended` live in pg_catalog,
-- which is searched implicitly, so they still resolve under `search_path = ''`.
create or replace function public.enforce_character_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  if (select count(*) from public.characters where user_id = new.user_id) >= 3 then
    raise exception 'character_limit_reached';
  end if;

  return new;
end;
$$;

-- CREATE OR REPLACE keeps the existing ACL, but re-stating the revokes costs
-- nothing and means this file is complete on its own if it is ever the one
-- someone pastes into the SQL editor.
revoke all on function public.enforce_character_limit() from public;
revoke all on function public.enforce_character_limit() from anon;
revoke all on function public.enforce_character_limit() from authenticated;
