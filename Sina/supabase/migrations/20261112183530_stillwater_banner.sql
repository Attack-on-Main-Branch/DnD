insert into public.banner_skins (skin, rarity)
values ('stillwater', 'uncommon')
on conflict (skin) do nothing;
