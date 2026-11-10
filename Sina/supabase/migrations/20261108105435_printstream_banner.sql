insert into public.banner_skins (skin, rarity)
values ('printstream', 'iconic')
on conflict (skin) do nothing;
