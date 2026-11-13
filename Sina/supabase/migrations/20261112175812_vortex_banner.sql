insert into public.banner_skins (skin, rarity)
values ('vortex', 'epic')
on conflict (skin) do nothing;
