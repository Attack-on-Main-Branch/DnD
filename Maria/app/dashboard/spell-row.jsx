import CatalogueRow from "./catalogue-row";
import { levelBadge } from "./spell-presentation";

export default function SpellRow({ spell, open = false, onOpen }) {
  const level = levelBadge(spell.level);

  return (
    <CatalogueRow
      name={spell.name}
      label={`${spell.name}, ${level}`}
      badge={level}
      open={open}
      onOpen={onOpen}
    />
  );
}
