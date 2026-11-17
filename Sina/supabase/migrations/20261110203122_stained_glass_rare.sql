insert into public.dice_skins (skin, rarity)
values ('stained-glass', 'rare')
on conflict (skin) do update set rarity = excluded.rarity;
