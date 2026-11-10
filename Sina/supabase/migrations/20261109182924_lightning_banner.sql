insert into public.banner_skins (skin, rarity)
values ('lightning', 'legendary')
on conflict (skin) do nothing;
