-- Character class, stored as an archetype plus the path chosen within it.
--
-- Both nullable. The characters created before classes existed have neither,
-- and there is nothing honest to backfill them with — a Warrior is a decision,
-- not something derivable from a name or a race. New characters must pick one;
-- that rule lives in validateCharacter and runs again in the Server Action,
-- rather than in a NOT NULL that would reject the rows already here.

alter table public.characters
  add column if not exists archetype text,
  add column if not exists class_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_class_check'
  ) then
    -- One tuple check rather than two independent ones: separate CHECKs on
    -- each column would happily accept ('warrior', 'wizard'). The pair is what
    -- has to be valid.
    --
    -- The `is not null` guards are load-bearing. A CHECK passes when its
    -- expression evaluates to NULL, and a row comparison against a NULL member
    -- yields exactly that — so without them, half-filled ('warrior', null)
    -- would slip through the constraint meant to catch it.
    alter table public.characters
      add constraint characters_class_check check (
        (archetype is null and class_id is null)
        or (
          archetype is not null
          and class_id is not null
          and (archetype, class_id) in (
            ('warrior', 'barbarian'),
            ('warrior', 'fighter'),
            ('warrior', 'paladin'),
            ('mage', 'wizard'),
            ('mage', 'sorcerer'),
            ('mage', 'warlock'),
            ('archer', 'ranger'),
            ('archer', 'arcane_archer'),
            ('assassin', 'rogue'),
            ('assassin', 'monk'),
            ('priest', 'cleric'),
            ('priest', 'druid'),
            ('priest', 'bard')
          )
        )
      );
  end if;
end
$$;
