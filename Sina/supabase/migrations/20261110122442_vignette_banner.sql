insert into public.banner_skins (skin, rarity)
values ('vignette', 'common')
on conflict (skin) do nothing;
