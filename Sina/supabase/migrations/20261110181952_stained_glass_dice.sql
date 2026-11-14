insert into public.dice_skins (skin, rarity)
values ('stained-glass', 'legendary')
on conflict (skin) do update set rarity = excluded.rarity;
