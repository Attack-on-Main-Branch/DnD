-- Bloodied: battered silver spattered with blood in the character's colour,
-- an Epic set found in a Dice Pouch like every other. Mirrors
-- DICE_SKINS_BY_RARITY in Sina/src/rules/character.js.

insert into public.dice_skins (skin, rarity)
values ('bloodied', 'epic')
on conflict (skin) do update set rarity = excluded.rarity;
