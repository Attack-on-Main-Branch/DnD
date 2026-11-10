insert into public.banner_skins (skin, rarity)
values ('cyberpunk', 'uncommon')
on conflict (skin) do nothing;
