insert into public.banner_skins (skin, rarity)
values ('sakura', 'legendary')
on conflict (skin) do nothing;
