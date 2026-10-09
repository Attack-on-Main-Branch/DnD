update public.dice_skins
set rarity = 'rare'
where skin in ('metal-rimmed', 'metal-inlaid', 'metal-cornered');

update public.dice_skins
set rarity = 'uncommon'
where skin in ('brass-rimmed', 'brass-inlaid', 'brass-cornered');
