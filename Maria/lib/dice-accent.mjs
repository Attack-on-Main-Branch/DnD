/**
 * A die's SECOND colour, for a skin painted in two: worked out from the
 * player's own, so whatever colour they pick comes with one that suits it.
 *
 * The vendored dice-box works it out on the GPU, from these numbers, which
 * scripts/dice-assets.mjs writes into each such theme's config — see
 * `accentShader` in Maria/vendor/dice-box/grimoire.patch. `diceAccentColor`
 * is the same sum for the pictures on the page. Change one and change the
 * other.
 *
 * The complement, mostly: the hue turned halfway round, so a teal comes with
 * a red and a blue with an amber. Turned straight, an indigo, a violet or a
 * purple would come with a sour yellow-green, so the turned hues from
 * `fold.from` to `fold.to` are squeezed into the golds up to `fold.into` —
 * which leaves one jump, from gold to green, across the pinkish purples. The
 * saturation is held in a band, so a muted colour still has a colour beside
 * it and a vivid one is not answered in neon; the lightness sits a little
 * under the middle, leaning away from the body's, so the two read apart on a
 * dark die and a pale one alike; and a grey, with no hue to turn, gets
 * copper.
 *
 * `.mjs` for the same reason as dice-themes.mjs: the build script reads it
 * under plain Node. Hues are in turns, 0 to 1.
 */
import { rgbOf } from "./dice-themes.mjs";

export const DICE_ACCENT = {
  turn: 0.5,
  fold: { from: 40 / 360, to: 130 / 360, into: 58 / 360 },
  saturation: [0.5, 0.72],
  lightness: { middle: 0.46, lean: 0.3, range: [0.36, 0.56] },
  grey: { hue: 25 / 360, saturation: 0.6, from: 0.1, to: 0.3 },
};

/** The skins painted in the player's colour and its accent. */
export const DICE_ACCENT_SKINS = ["dragonscale"];

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const fract = (value) => value - Math.floor(value);

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}

function toHsl([r, g, b]) {
  const high = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  const light = (high + low) / 2;
  const span = high - low;

  if (span < 0.00001) {
    return [0, 0, light];
  }

  const hue =
    high === r
      ? ((((g - b) / span) % 6) + 6) % 6
      : high === g
        ? (b - r) / span + 2
        : (r - g) / span + 4;

  return [hue / 6, span / (1 - Math.abs(2 * light - 1)), light];
}

function toRgb([hue, saturation, light]) {
  const reach = saturation * Math.min(light, 1 - light);

  return [0, 8, 4].map((offset) => {
    const k = (offset + hue * 12) % 12;

    return light - reach * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  });
}

/** `#1f8f9a` → the colour its accent is, as a hex. */
export function diceAccentColor(hex) {
  const { turn, fold, saturation, lightness, grey } = DICE_ACCENT;
  const [h, s, l] = toHsl(rgbOf(hex).map((value) => value / 255));
  let hue = fract(h + turn);

  if (hue > fold.from && hue < fold.to) {
    hue =
      fold.from +
      ((hue - fold.from) * (fold.into - fold.from)) / (fold.to - fold.from);
  }

  const light = clamp(
    lightness.middle + lightness.lean * (0.5 - l),
    lightness.range[0],
    lightness.range[1],
  );
  const turned = toRgb([hue, clamp(s, saturation[0], saturation[1]), light]);
  const fallback = toRgb([grey.hue, grey.saturation, light]);
  const weight = smoothstep(grey.from, grey.to, s);

  return `#${fallback
    .map((value, k) =>
      Math.round(255 * (value + (turned[k] - value) * weight))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
