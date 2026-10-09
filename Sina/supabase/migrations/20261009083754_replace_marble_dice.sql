insert into public.dice_skins (skin, rarity)
values ('pearl', 'uncommon')
on conflict (skin) do update set rarity = excluded.rarity;

-- Hold the retired key and its unlocks while pouch draws and announcements move.
do $$
begin
  perform 1 from public.dice_skins where skin = 'pearlescent' for update;
  perform 1 from public.character_dice_skins where skin = 'pearlescent' for update;
end;
$$;

insert into public.character_dice_skins (character_id, skin, unlocked_at, announced)
select character_id, 'pearl', unlocked_at, announced
from public.character_dice_skins
where skin = 'pearlescent'
on conflict (character_id, skin) do update
set unlocked_at = least(character_dice_skins.unlocked_at, excluded.unlocked_at),
    announced = character_dice_skins.announced or excluded.announced;

update public.characters set dice_skin = 'pearl' where dice_skin = 'pearlescent';
update public.campaigns set dice_skin = 'pearl' where dice_skin = 'pearlescent';

update public.campaign_activity_logs
set payload = jsonb_set(payload, '{skin}', '"pearl"'::jsonb)
where action_type = 'dice_pouch_opened' and payload ->> 'skin' = 'pearlescent';

delete from public.character_dice_skins where skin = 'pearlescent';
delete from public.dice_skins where skin = 'pearlescent';
