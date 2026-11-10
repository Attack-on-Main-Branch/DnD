insert into public.banner_skins (skin, rarity)
values ('splash', 'common')
on conflict (skin) do nothing;
