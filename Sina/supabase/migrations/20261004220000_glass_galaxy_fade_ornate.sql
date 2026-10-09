-- Four more dice styles: `glass`, `galaxy`, `fade` and `ornate`. Mirrors
-- DICE_SKIN_VALUES in Sina/src/rules/character.js.
--
-- The list is the whole of this file, and supersedes 20261004210000's: run
-- that one again after this and these four are refused until this one is too.

alter table public.characters
  drop constraint if exists characters_dice_skin_check;

alter table public.characters
  add constraint characters_dice_skin_check
    check (
      dice_skin in (
        'classic',
        'metal-rimmed',
        'gold-rimmed',
        'brass-rimmed',
        'epoxy',
        'paper',
        'cracked',
        'metal-inlaid',
        'gold-inlaid',
        'brass-inlaid',
        'asiimov',
        'wood',
        'companion',
        'crystal',
        'glass',
        'galaxy',
        'fade',
        'ornate'
      )
    );
