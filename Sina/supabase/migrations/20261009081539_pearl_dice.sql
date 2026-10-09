insert into public.dice_skins (skin, rarity)
values ('pearl', 'rare')
on conflict (skin) do update set rarity = excluded.rarity;
