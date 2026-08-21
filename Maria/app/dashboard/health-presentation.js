import { HEALTH_TIERS } from "sina/rules/health";

/**
 * What each health tier looks like: solar while the character is holding up,
 * ember once bloodied, ruby with a heartbeat near the end. Sina decides where
 * the thresholds fall, globals.css holds the treatment.
 *
 * Its own module rather than a section of character-presentation.js, for the
 * reason `sina/rules/health` is one: the bar is edited in the browser, and that
 * neighbour reaches into the RACES and ARCHETYPES catalogues and imports six
 * pieces of race artwork.
 *
 * The class strings must stay literal for Tailwind's scanner to find them.
 */
const HEALTH_BAR_BY_TIER = {
  healthy: "hp-solar",
  wounded: "hp-ember",
  critical: "hp-ruby",
};

const UNSTYLED_TIERS = HEALTH_TIERS.filter((tier) => !HEALTH_BAR_BY_TIER[tier]);

if (UNSTYLED_TIERS.length > 0) {
  throw new Error(
    `health-presentation: no class for health tier ` +
      `${UNSTYLED_TIERS.join(", ")}. Sina lists it in rules/health.js — ` +
      `add it to HEALTH_BAR_BY_TIER here, or the bar renders untinted.`,
  );
}

/** No fallback: `healthTier` only ever returns one of the tiers checked above. */
export function healthBarClass(tier) {
  return HEALTH_BAR_BY_TIER[tier];
}
