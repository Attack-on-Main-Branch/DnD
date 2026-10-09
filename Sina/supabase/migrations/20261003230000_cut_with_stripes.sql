-- Three more dice styles: `metal-striped`, `gold-striped` and `brass-striped`,
-- worn metal cut with glittering stripes. Mirrors DICE_SKIN_VALUES in
-- Sina/src/rules/character.js.
--
-- The list is the whole of this file, and supersedes 20261003220000's: run
-- that one again after this and the striped styles are refused until this one
-- is too.

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
        'metal-striped',
        'gold-striped',
        'brass-striped'
      )
    );
