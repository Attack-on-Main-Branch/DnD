insert into public.banner_skins (skin, rarity)
values ('pixel-night', 'rare')
on conflict (skin) do nothing;
