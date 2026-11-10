insert into public.banner_skins (skin, rarity)
values ('topography', 'epic')
on conflict (skin) do nothing;
