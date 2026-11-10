insert into public.banner_skins (skin, rarity)
values ('spider-lilies', 'legendary')
on conflict (skin) do nothing;
