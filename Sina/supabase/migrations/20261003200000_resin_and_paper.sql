-- Two more dice styles: `epoxy`, set in resin, and `paper`, folded from a
-- sheet and drawn on in pen. Mirrors DICE_SKIN_VALUES in
-- Sina/src/rules/character.js.
--
-- The list is the whole of this file. `set_character_dice` writes any style
-- this check admits, so nothing else needs to learn the new names.

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
        'paper'
      )
    );
