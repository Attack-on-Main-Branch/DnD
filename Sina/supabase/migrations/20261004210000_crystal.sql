-- One more dice style: `crystal`, faceted glass in the player's colour,
-- lettered in gold. Mirrors DICE_SKIN_VALUES in Sina/src/rules/character.js.
--
-- The list is the whole of this file, and supersedes 20261004200000's: run
-- that one again after this and `crystal` is refused until this one is too.

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
        'crystal'
      )
    );
