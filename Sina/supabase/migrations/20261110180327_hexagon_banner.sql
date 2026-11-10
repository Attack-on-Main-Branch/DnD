insert into public.banner_skins (skin, rarity)
values ('hexagon', 'epic')
on conflict (skin) do nothing;
