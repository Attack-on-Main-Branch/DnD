const COIN_NAMES = {
  cp: "Copper",
  sp: "Silver",
  ep: "Electrum",
  gp: "Gold",
  pp: "Platinum",
};

export function coinName(coin) {
  return COIN_NAMES[coin] ?? String(coin ?? "").toUpperCase();
}

export function coinTint(coin) {
  return `var(--color-${coinName(coin).toLowerCase()})`;
}

export const COIN_PANEL_CLASSES =
  "rounded-xl border border-gold/20 bg-surface/70 px-3.5 py-3 " +
  "shadow-[inset_0_1px_0_rgba(255,223,156,0.08)]";
