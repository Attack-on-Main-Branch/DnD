insert into public.banner_skins (skin, rarity)
values ('carbon-fiber', 'uncommon')
on conflict (skin) do nothing;
