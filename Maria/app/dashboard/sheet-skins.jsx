import TabStrip from "@/app/components/ui/tab-strip";

import SheetBanners from "./sheet-banners";
import SheetDice from "./sheet-dice";

const SKIN_TABS = [
  { value: "dice", label: "Dice", focusable: false },
  { value: "banners", label: "Banners", focusable: false, defer: true },
];

export default function SheetSkins({
  bannerSkin,
  bannerUnlocked,
  saveBanner,
  character,
  ...dice
}) {
  return (
    <TabStrip
      tabs={SKIN_TABS}
      label="Skin collections"
      panels={{
        dice: <SheetDice {...dice} />,
        banners: (
          <SheetBanners
            bannerSkin={bannerSkin}
            unlocked={bannerUnlocked}
            allUnlocked={dice.allUnlocked}
            saveBanner={saveBanner}
            character={character}
            diceColor={dice.diceColor ?? character?.dice_color}
          />
        ),
      }}
    />
  );
}
