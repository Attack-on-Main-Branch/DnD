insert into public.banner_skins (skin, rarity)
values ('black-hole', 'rare')
on conflict (skin) do nothing;
