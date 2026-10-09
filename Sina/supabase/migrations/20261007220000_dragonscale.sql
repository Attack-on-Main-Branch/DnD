-- Dragonscale: overlapping scales in the character's colour, patched in a
-- second colour worked out from it — a Rare set found in a Dice Pouch like
-- every other. Mirrors DICE_SKINS_BY_RARITY in Sina/src/rules/character.js.

insert into public.dice_skins (skin, rarity)
values ('dragonscale', 'rare')
on conflict (skin) do update set rarity = excluded.rarity;
