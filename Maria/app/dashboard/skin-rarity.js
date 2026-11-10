import { SKIN_RARITIES } from "sina/rules/skins";

const RARITY_LOOK = {
  common: {
    label: "Common",
    text: "text-rarity-common",
    stripe: "border-l-rarity-common",
    bar: "bg-rarity-common",
    wash: "from-rarity-common/25",
    edge: "border-rarity-common/40",
    edgeHover: "hover:border-rarity-common/65",
    edgeSelected:
      "border-rarity-common/80 shadow-[0_18px_44px_-30px_var(--color-rarity-common)]",
    glow: "shadow-[inset_0_0_18px_-4px_var(--color-rarity-common)] opacity-45",
    glowSelected:
      "shadow-[inset_0_0_18px_-4px_var(--color-rarity-common)] opacity-80",
  },
  uncommon: {
    label: "Uncommon",
    text: "text-rarity-uncommon",
    stripe: "border-l-rarity-uncommon",
    bar: "bg-rarity-uncommon",
    wash: "from-rarity-uncommon/25",
    edge: "border-rarity-uncommon/40",
    edgeHover: "hover:border-rarity-uncommon/65",
    edgeSelected:
      "border-rarity-uncommon/80 shadow-[0_18px_44px_-29px_var(--color-rarity-uncommon)]",
    glow: "shadow-[inset_0_0_21px_-4px_var(--color-rarity-uncommon)] opacity-45",
    glowSelected:
      "shadow-[inset_0_0_21px_-4px_var(--color-rarity-uncommon)] opacity-80",
  },
  rare: {
    label: "Rare",
    text: "text-rarity-rare",
    stripe: "border-l-rarity-rare",
    bar: "bg-rarity-rare",
    wash: "from-rarity-rare/25",
    edge: "border-rarity-rare/40",
    edgeHover: "hover:border-rarity-rare/65",
    edgeSelected:
      "border-rarity-rare/80 shadow-[0_18px_44px_-28px_var(--color-rarity-rare)]",
    glow: "shadow-[inset_0_0_24px_-4px_var(--color-rarity-rare)] opacity-50",
    glowSelected:
      "shadow-[inset_0_0_24px_-4px_var(--color-rarity-rare)] opacity-85",
  },
  epic: {
    label: "Epic",
    text: "text-rarity-epic",
    stripe: "border-l-rarity-epic",
    bar: "bg-rarity-epic",
    wash: "from-rarity-epic/25",
    edge: "border-rarity-epic/45",
    edgeHover: "hover:border-rarity-epic/70",
    edgeSelected:
      "border-rarity-epic/90 shadow-[0_18px_44px_-26px_var(--color-rarity-epic)]",
    glow: "shadow-[inset_0_0_32px_-3px_var(--color-rarity-epic)] opacity-60",
    glowSelected:
      "shadow-[inset_0_0_32px_-3px_var(--color-rarity-epic)] opacity-100",
  },
  legendary: {
    label: "Legendary",
    text: "text-rarity-legendary",
    stripe: "border-l-rarity-legendary",
    bar: "bg-rarity-legendary",
    wash: "from-rarity-legendary/25",
    edge: "border-rarity-legendary/50",
    edgeHover: "hover:border-rarity-legendary/80",
    edgeSelected:
      "border-rarity-legendary shadow-[0_18px_44px_-24px_var(--color-rarity-legendary)]",
    glow: "shadow-[inset_0_0_42px_-2px_var(--color-rarity-legendary)] opacity-70",
    glowSelected:
      "shadow-[inset_0_0_42px_-2px_var(--color-rarity-legendary)] opacity-100",
  },
  iconic: {
    label: "Iconic",
    text: "text-rarity-iconic",
    stripe: "border-l-rarity-iconic",
    bar: "bg-rarity-iconic",
    wash: "from-rarity-iconic/25",
    edge: "border-rarity-iconic/60",
    edgeHover: "hover:border-rarity-iconic/90",
    edgeSelected:
      "border-rarity-iconic shadow-[0_18px_44px_-20px_var(--color-rarity-iconic)]",
    glow: "shadow-[inset_0_0_52px_-1px_var(--color-rarity-iconic)] opacity-80",
    glowSelected:
      "shadow-[inset_0_0_52px_-1px_var(--color-rarity-iconic)] opacity-100",
  },
};

if (SKIN_RARITIES.some((rarity) => !RARITY_LOOK[rarity])) {
  throw new Error("skin-rarity: a skin rarity has no presentation.");
}

export function skinRarityLook(rarity) {
  return RARITY_LOOK[rarity] ?? RARITY_LOOK.common;
}
