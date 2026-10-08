-- Metal-, Brass- and Gold-cornered: swirled enamel in the character's colour,
-- framed by a metal rim with a bracket in every corner — Rare, Epic and
-- Legendary, found in a Dice Pouch like every other. Mirrors
-- DICE_SKINS_BY_RARITY in Sina/src/rules/character.js.

insert into public.dice_skins (skin, rarity)
values
  ('metal-cornered', 'rare'),
  ('brass-cornered', 'epic'),
  ('gold-cornered', 'legendary')
on conflict (skin) do update set rarity = excluded.rarity;
