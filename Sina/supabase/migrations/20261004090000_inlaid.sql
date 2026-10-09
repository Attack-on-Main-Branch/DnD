-- The striped dice styles give way to inlaid ones: `metal-inlaid`,
-- `gold-inlaid` and `brass-inlaid`, a ring of glitter sunk round a raised
-- plate on every face. Mirrors DICE_SKIN_VALUES in Sina/src/rules/character.js.
--
-- A character still on a striped style keeps its metal and moves to the
-- inlaid one. The list is the whole of this file, and supersedes
-- 20261003230000's: run that one again after this and the inlaid styles are
-- refused until this one is too.

alter table public.characters
  drop constraint if exists characters_dice_skin_check;

update public.characters
  set dice_skin = replace(dice_skin, '-striped', '-inlaid')
  where dice_skin in ('metal-striped', 'gold-striped', 'brass-striped');

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
        'brass-inlaid'
      )
    );
