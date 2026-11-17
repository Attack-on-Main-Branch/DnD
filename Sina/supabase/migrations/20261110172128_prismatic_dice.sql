insert into public.dice_skins (skin, rarity)
values ('prismatic', 'legendary')
on conflict (skin) do update set rarity = excluded.rarity;
