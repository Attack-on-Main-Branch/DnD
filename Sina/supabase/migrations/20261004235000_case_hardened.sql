-- Case Hardened: heat-tinted steel, mottled mostly blue with gold, a Legendary
-- set found in a Dice Pouch like every other. Mirrors DICE_SKINS_BY_RARITY in
-- Sina/src/rules/character.js.

insert into public.dice_skins (skin, rarity)
values ('case-hardened', 'legendary')
on conflict (skin) do update set rarity = excluded.rarity;

-- 20261004230000's swap of the old skin CHECK for a foreign key to the table
-- above, again: it was added to that file after the file may already have
-- been pushed, and a pushed migration is never re-read. Nothing here if it was
-- applied; without it the CHECK's eighteen names would refuse this skin.
alter table public.characters
  drop constraint if exists characters_dice_skin_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_dice_skin_fkey'
  ) then
    alter table public.characters
      add constraint characters_dice_skin_fkey
        foreign key (dice_skin) references public.dice_skins (skin);
  end if;
end
$$;
