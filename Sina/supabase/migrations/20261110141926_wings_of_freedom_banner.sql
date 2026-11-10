insert into public.banner_skins (skin, rarity)
values ('wings-of-freedom', 'iconic')
on conflict (skin) do nothing;
