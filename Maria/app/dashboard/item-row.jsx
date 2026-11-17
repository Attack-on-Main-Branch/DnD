import HandMark from "@/app/components/ui/hand-mark";

import CatalogueRow from "./catalogue-row";
import { stackLabel } from "./inventory-presentation";

export default function ItemRow({
  item,
  quantity,
  open = false,
  inHand = false,
  onOpen,
}) {
  const stack = stackLabel(quantity);
  const name = inHand ? `${item.name}, in hand` : item.name;

  return (
    <CatalogueRow
      name={item.name}
      label={stack ? `${name}, ${stack}` : name}
      badge={stack}
      open={open}
      onOpen={onOpen}
    >
      {inHand && <HandMark className="size-3.5 shrink-0 text-gold" />}
    </CatalogueRow>
  );
}
