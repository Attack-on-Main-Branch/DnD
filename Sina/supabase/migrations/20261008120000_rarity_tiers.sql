-- Six rarities where there were four: Uncommon between Common and Rare, and
-- Iconic above Legendary, with every set moved to its new place and a Dice
-- Pouch's odds shared out again — 40, 24, 16, 12, 6 and 2 in a hundred.
-- Mirrors DICE_SKINS_BY_RARITY in Sina/src/rules/character.js and
-- DICE_POUCH_ODDS in Sina/src/rules/dice-pouch.js.

alter table public.dice_skins
  drop constraint if exists dice_skins_rarity_check;

alter table public.dice_skins
  add constraint dice_skins_rarity_check
  check (
    rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary', 'iconic')
  );

insert into public.dice_skins (skin, rarity) values
  ('classic', 'common'),
  ('crystal', 'common'),
  ('glass', 'common'),
  ('fade', 'common'),
  ('ornate', 'common'),
  ('metal-rimmed', 'uncommon'),
  ('metal-inlaid', 'uncommon'),
  ('metal-cornered', 'uncommon'),
  ('cracked', 'uncommon'),
  ('brass-rimmed', 'rare'),
  ('brass-inlaid', 'rare'),
  ('brass-cornered', 'rare'),
  ('galaxy', 'rare'),
  ('dragonscale', 'rare'),
  ('gold-rimmed', 'epic'),
  ('gold-inlaid', 'epic'),
  ('gold-cornered', 'epic'),
  ('wood', 'epic'),
  ('paper', 'epic'),
  ('epoxy', 'legendary'),
  ('labradorite', 'legendary'),
  ('bloodied', 'legendary'),
  ('asiimov', 'iconic'),
  ('companion', 'iconic'),
  ('case-hardened', 'iconic')
on conflict (skin) do update set rarity = excluded.rarity;

-- 20261004230000's draw, with the six rarities' odds; nothing else changed.

create or replace function public.open_dice_pouch(
  p_campaign uuid,
  p_character uuid
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_pouch uuid;
  v_have integer;
  v_roll double precision := random();
  v_rarity text;
  v_skin text;
begin
  if p_character is null
    or not public.my_seat_at_table(p_campaign, p_character)
  then
    return null;
  end if;

  select i.id, i.quantity into v_pouch, v_have
  from public.character_inventory i
  where i.character_id = p_character
    and i.item_slug = 'dice-pouch'
    and i.container_id is null
  for update;

  if v_pouch is null or v_have < 1 then
    return null;
  end if;

  with odds (rarity, weight, rank) as (
    values
      ('common', 40, 1),
      ('uncommon', 24, 2),
      ('rare', 16, 3),
      ('epic', 12, 4),
      ('legendary', 6, 5),
      ('iconic', 2, 6)
  ),
  pool as (
    select s.skin, s.rarity
    from public.dice_skins s
    where s.skin <> 'classic'
      and not exists (
        select 1 from public.character_dice_skins o
        where o.character_id = p_character and o.skin = s.skin
      )
  ),
  ladder as (
    select o.rarity,
           sum(o.weight) over (order by o.rank) as reach,
           sum(o.weight) over () as total
    from odds o
    where exists (select 1 from pool p where p.rarity = o.rarity)
  )
  select l.rarity into v_rarity
  from ladder l
  where l.reach > v_roll * l.total
  order by l.reach
  limit 1;

  if v_rarity is null then
    raise exception 'dice_pouch_empty';
  end if;

  select s.skin into v_skin
  from public.dice_skins s
  where s.rarity = v_rarity
    and s.skin <> 'classic'
    and not exists (
      select 1 from public.character_dice_skins o
      where o.character_id = p_character and o.skin = s.skin
    )
  order by random()
  limit 1;

  insert into public.character_dice_skins (character_id, skin)
  values (p_character, v_skin);

  if v_have > 1 then
    update public.character_inventory
      set quantity = v_have - 1
      where id = v_pouch;
  else
    delete from public.character_inventory where id = v_pouch;
  end if;

  return v_skin;
end;
$fn$;

revoke all on function public.open_dice_pouch(uuid, uuid) from public;
revoke all on function public.open_dice_pouch(uuid, uuid) from anon;
grant execute on function public.open_dice_pouch(uuid, uuid) to authenticated;
