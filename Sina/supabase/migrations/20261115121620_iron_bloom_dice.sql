insert into public.dice_skins (skin, rarity)
values ('iron-bloom', 'uncommon')
on conflict (skin) do update set rarity = excluded.rarity;
