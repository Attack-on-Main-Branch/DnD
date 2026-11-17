insert into public.dice_skins (skin, rarity)
values ('carbon-fiber', 'common')
on conflict (skin) do update set rarity = excluded.rarity;
