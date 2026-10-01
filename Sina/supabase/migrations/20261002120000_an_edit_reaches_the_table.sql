-- An edit reaches the table: rewriting a catalogue item or spell rewrites the
-- copies the party already holds.
--
-- 20261002090000 let a Dungeon Master edit what they wrote down, and left every
-- pack and spellbook holding the old copy -- which is what 20260822160000 said a
-- copy was for. At the table that reads as the edit not having happened, so the
-- copies follow now: the packs and spellbooks of this campaign's members, and
-- the containers on this campaign's table.
--
-- DEFINERS, because the rows are other people's: a player's pack has no policy
-- that lets the Dungeon Master rename what is in it, and `container_items` has
-- no write policy at all. Each asks `owns_campaign` first and answers null to
-- anybody else, which the data layer reads as a refusal.
--
-- HOMEBREW ONLY. Both slugs must carry the `custom:` prefix, so no catalogue
-- entry can rename an SRD stack by naming its slug.
--
-- A RENAME FOLDS INTO A STACK ALREADY THERE. The stacking key is the slug, so a
-- character holding both the old and the new name ends up holding one stack of
-- the two together, as a grant of the new name would have made. A spellbook
-- that already knows the new name keeps that row and drops the old one.
--
-- Nothing here is logged. The pack's log trigger writes only for a deed armed
-- in the same transaction (see 20260830090000), and this arms none: a rename is
-- tidying the catalogue, not something that happened at the table.

create or replace function public.rewrite_campaign_item_copies(
  p_campaign_id uuid,
  p_old_slug text,
  p_new_slug text,
  p_name text,
  p_category text,
  p_description text,
  p_facts jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_packs integer;
  v_chests integer;
begin
  if not public.owns_campaign(p_campaign_id)
     or p_old_slug not like 'custom:%'
     or p_new_slug not like 'custom:%' then
    return null;
  end if;

  if p_new_slug <> p_old_slug then
    update public.character_inventory t
    set quantity = least(999, t.quantity + o.quantity)
    from public.character_inventory o
    where o.item_slug = p_old_slug
      and o.is_custom
      and o.character_id in (
        select m.character_id from public.campaign_members m
        where m.campaign_id = p_campaign_id
      )
      and t.item_slug = p_new_slug
      and t.character_id = o.character_id
      and t.container_id is not distinct from o.container_id;

    delete from public.character_inventory o
    where o.item_slug = p_old_slug
      and o.is_custom
      and o.character_id in (
        select m.character_id from public.campaign_members m
        where m.campaign_id = p_campaign_id
      )
      and exists (
        select 1 from public.character_inventory t
        where t.item_slug = p_new_slug
          and t.character_id = o.character_id
          and t.container_id is not distinct from o.container_id
      );

    update public.character_inventory
    set item_slug = p_new_slug
    where item_slug = p_old_slug
      and is_custom
      and character_id in (
        select m.character_id from public.campaign_members m
        where m.campaign_id = p_campaign_id
      );

    update public.container_items t
    set quantity = least(999, t.quantity + o.quantity)
    from public.container_items o
    where o.item_slug = p_old_slug
      and o.is_custom
      and o.container_id in (
        select c.id from public.containers c
        where c.campaign_id = p_campaign_id
      )
      and t.item_slug = p_new_slug
      and t.container_id = o.container_id;

    delete from public.container_items o
    where o.item_slug = p_old_slug
      and o.is_custom
      and o.container_id in (
        select c.id from public.containers c
        where c.campaign_id = p_campaign_id
      )
      and exists (
        select 1 from public.container_items t
        where t.item_slug = p_new_slug
          and t.container_id = o.container_id
      );

    update public.container_items
    set item_slug = p_new_slug
    where item_slug = p_old_slug
      and is_custom
      and container_id in (
        select c.id from public.containers c
        where c.campaign_id = p_campaign_id
      );
  end if;

  update public.character_inventory
  set name = p_name,
      category = p_category,
      description = p_description,
      facts = coalesce(p_facts, '{}'::jsonb)
  where item_slug = p_new_slug
    and is_custom
    and character_id in (
      select m.character_id from public.campaign_members m
      where m.campaign_id = p_campaign_id
    );

  get diagnostics v_packs = row_count;

  update public.container_items
  set name = p_name,
      category = p_category,
      description = p_description,
      facts = coalesce(p_facts, '{}'::jsonb)
  where item_slug = p_new_slug
    and is_custom
    and container_id in (
      select c.id from public.containers c
      where c.campaign_id = p_campaign_id
    );

  get diagnostics v_chests = row_count;

  return v_packs + v_chests;
end;
$fn$;

revoke all on function public.rewrite_campaign_item_copies(
  uuid, text, text, text, text, text, jsonb
) from public, anon;
grant execute on function public.rewrite_campaign_item_copies(
  uuid, text, text, text, text, text, jsonb
) to authenticated;

-- `p_spell` carries the catalogue row's own column names, so the copy is the
-- row as it now stands rather than eighteen positional arguments.
create or replace function public.rewrite_campaign_spell_copies(
  p_campaign_id uuid,
  p_old_slug text,
  p_spell jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_new_slug text := p_spell->>'spell_slug';
  v_rows integer;
begin
  if not public.owns_campaign(p_campaign_id)
     or p_old_slug not like 'custom:%'
     or coalesce(v_new_slug, '') not like 'custom:%' then
    return null;
  end if;

  if v_new_slug <> p_old_slug then
    delete from public.character_spells o
    where o.spell_slug = p_old_slug
      and o.character_id in (
        select m.character_id from public.campaign_members m
        where m.campaign_id = p_campaign_id
      )
      and exists (
        select 1 from public.character_spells t
        where t.spell_slug = v_new_slug
          and t.character_id = o.character_id
      );

    update public.character_spells
    set spell_slug = v_new_slug
    where spell_slug = p_old_slug
      and character_id in (
        select m.character_id from public.campaign_members m
        where m.campaign_id = p_campaign_id
      );
  end if;

  update public.character_spells
  set name = p_spell->>'name',
      level = (p_spell->>'level')::integer,
      school = coalesce(p_spell->>'school', ''),
      casting_time = coalesce(p_spell->>'casting_time', ''),
      range_text = coalesce(p_spell->>'range_text', ''),
      components = coalesce(p_spell->>'components', ''),
      material = coalesce(p_spell->>'material', ''),
      duration = coalesce(p_spell->>'duration', ''),
      concentration = coalesce((p_spell->>'concentration')::boolean, false),
      ritual = coalesce((p_spell->>'ritual')::boolean, false),
      attack_save = coalesce(p_spell->>'attack_save', ''),
      damage = coalesce(p_spell->>'damage', ''),
      description = coalesce(p_spell->>'description', ''),
      higher_level = coalesce(p_spell->>'higher_level', ''),
      classes = coalesce(p_spell->>'classes', '')
  where spell_slug = v_new_slug
    and character_id in (
      select m.character_id from public.campaign_members m
      where m.campaign_id = p_campaign_id
    );

  get diagnostics v_rows = row_count;

  return v_rows;
end;
$fn$;

revoke all on function public.rewrite_campaign_spell_copies(uuid, text, jsonb)
  from public, anon;
grant execute on function public.rewrite_campaign_spell_copies(uuid, text, jsonb)
  to authenticated;
