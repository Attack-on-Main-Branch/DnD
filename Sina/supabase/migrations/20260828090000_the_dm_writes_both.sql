-- The Dungeon Master's own catalogue, of both kinds.
--
-- 20260822160000 gave a campaign items the SRD has never heard of, with three
-- fields: a name, a category and a sentence. That was enough while the only
-- thing a homebrew item had to do was appear on a card. It is not enough now
-- that the SRD's own entries arrive with a price, a weight and a damage die,
-- and are read at the table beside these -- a made-up sword with no dice reads
-- as an oversight rather than as a choice.
--
-- So: the same fields the external catalogue carries, on both kinds, each in a
-- column of its own rather than folded into the sentence. What is COPIED into a
-- pack is still one card's worth of text, composed in the search route the way
-- the SRD's own facts already are -- see `describe` in api/items/search.
--
-- And spells get a catalogue at all, which they did not have. `campaign_spells`
-- is `character_spells` minus the two columns that belong to a caster rather
-- than to a spell, plus the campaign it was invented for.

-- ---------------------------------------------------------------------------
-- What an item is, in full.
-- ---------------------------------------------------------------------------
alter table public.campaign_items
  add column if not exists cost_quantity integer not null default 0,
  add column if not exists cost_unit text not null default '',
  add column if not exists weight numeric(8, 2) not null default 0,
  add column if not exists damage_dice text not null default '',
  add column if not exists damage_type text not null default '',
  add column if not exists armor_class integer not null default 0,
  add column if not exists properties text not null default '';

-- Mirrors Sina/src/rules/inventory.js. Zero is "not priced", "weightless",
-- "no armour" -- a nullable column for each would be three more states to
-- answer for and the form has no way to say "unknown" anyway.
do $ck$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'campaign_items_detail_check'
  ) then
    alter table public.campaign_items
      add constraint campaign_items_detail_check
      check (
        cost_quantity between 0 and 999999
        and char_length(cost_unit) <= 8
        and weight >= 0
        and weight <= 9999
        and char_length(damage_dice) <= 40
        and char_length(damage_type) <= 40
        and armor_class between 0 and 30
        and char_length(properties) <= 120
      );
  end if;
end;
$ck$;

-- ---------------------------------------------------------------------------
-- A campaign's own spells.
-- ---------------------------------------------------------------------------
--
-- The catalogue and the spellbook are deliberately separate tables, for the
-- reason 20260822160000 gives about items: this is what EXISTS in the world,
-- and `character_spells` is who has learned it. Striking a spell out of the
-- catalogue does not strike it out of the book of whoever knows it -- the book
-- row is a copy, made when it was taught, and the two go on independently. No
-- foreign key between them, on purpose.

create table if not exists public.campaign_spells (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null
    references public.campaigns (id) on delete cascade,

  -- `custom:frost-lash`, derived by `customSpellSlug` in
  -- Sina/src/rules/spells.js from the NAME and never chosen by the browser.
  -- The prefix is what tells this apart from an SRD spell of the same name at
  -- the table: `character_spells` is unique on the slug, so the two can sit on
  -- one shelf without colliding.
  spell_slug text not null,

  name text not null,
  level integer not null,

  school text not null default '',
  casting_time text not null default '',
  range_text text not null default '',
  duration text not null default '',
  components text not null default '',
  material text not null default '',

  concentration boolean not null default false,
  ritual boolean not null default false,

  attack_save text not null default '',
  damage text not null default '',

  description text not null default '',
  higher_level text not null default '',
  classes text not null default '',

  created_at timestamptz not null default now(),

  unique (campaign_id, spell_slug)
);

-- The same bounds `character_spells` carries, and for the same reason the item
-- catalogue's mirror the pack's: an entry that could not be copied into a
-- spellbook would be an entry nobody could teach.
do $ck$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'campaign_spells_bounds_check'
  ) then
    alter table public.campaign_spells
      add constraint campaign_spells_bounds_check
      check (
        level between 0 and 9
        and char_length(btrim(name)) between 1 and 80
        and char_length(spell_slug) between 1 and 100
        and char_length(school) <= 40
        and char_length(casting_time) <= 80
        and char_length(range_text) <= 80
        and char_length(duration) <= 80
        and char_length(components) <= 80
        and char_length(material) <= 300
        and char_length(attack_save) <= 120
        and char_length(damage) <= 120
        and char_length(description) <= 2000
        and char_length(higher_level) <= 600
        and char_length(classes) <= 120
      );
  end if;
end;
$ck$;

alter table public.campaign_spells enable row level security;

-- The Dungeon Master's, and nobody else's — the item catalogue's own three
-- policies, word for word. A player never reads this: the catalogue is what
-- MIGHT be in the world, and reading it would be reading the notes.
--
-- No UPDATE policy, deliberately. A spell is written down or struck out; an
-- edit is the two, and a catalogue whose entries change under the books already
-- copied from them is a catalogue nobody can trust.

drop policy if exists "DMs read their own spellbook" on public.campaign_spells;
create policy "DMs read their own spellbook"
  on public.campaign_spells for select to authenticated
  using (public.owns_campaign(campaign_id));

drop policy if exists "DMs write their own spellbook" on public.campaign_spells;
create policy "DMs write their own spellbook"
  on public.campaign_spells for insert to authenticated
  with check (public.owns_campaign(campaign_id));

drop policy if exists "DMs strike from their own spellbook" on public.campaign_spells;
create policy "DMs strike from their own spellbook"
  on public.campaign_spells for delete to authenticated
  using (public.owns_campaign(campaign_id));

-- Sixty, the ceiling the item catalogue keeps, enforced the same way: an
-- advisory lock on the campaign so two browsers cannot both pass the count, and
-- a raise the data layer matches on by message.
create or replace function public.enforce_campaign_spell_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if (select auth.uid()) is not null
     and not public.owns_campaign(new.campaign_id) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.campaign_id::text, 4));

  if (
    select count(*) from public.campaign_spells
    where campaign_id = new.campaign_id
  ) >= 60 then
    raise exception 'spell_limit_reached';
  end if;

  return new;
end;
$fn$;

-- A SECURITY DEFINER function is executable by PUBLIC unless told otherwise,
-- and this one counts rows across every campaign. Nothing should be able to
-- call it except the trigger that owns it.
revoke all on function public.enforce_campaign_spell_limit() from public;
revoke all on function public.enforce_campaign_spell_limit() from anon;
revoke all on function public.enforce_campaign_spell_limit() from authenticated;

drop trigger if exists campaign_spells_enforce_limit on public.campaign_spells;
create trigger campaign_spells_enforce_limit
  before insert on public.campaign_spells
  for each row execute function public.enforce_campaign_spell_limit();
