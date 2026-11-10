insert into public.banner_skins (skin, rarity)
values ('shattered-glass', 'rare')
on conflict (skin) do nothing;
