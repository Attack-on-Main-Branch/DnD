# dice-box, with physically based metal, glass, a second colour, depth and a turnable die

[`@3d-dice/dice-box`](https://github.com/3d-dice/dice-box) 1.1.4 (MIT — see
`LICENSE`), rebuilt with one addition: a theme whose material is
`"type": "color"` may also say `"shading": "pbr"`. It is then drawn with
Babylon's physically based material instead of the standard one — metal that
reflects a room, rough or polished texel by texel — and everything else stays
as it was:

- **Same names, same colour.** It still makes `<theme>_light` and
  `<theme>_dark`, and still mixes the per-die `customColor` in wherever the
  albedo texture is transparent, so the main thread treats it as the colour
  material it already knows.
- **Every other theme is untouched.** The reflections come from
  `scene.environmentTexture`, which the standard material never reads, and it
  is only made the first time a PBR theme loads.
- **The physics and the main thread are byte for byte upstream's.**
  `dist/dice-box.es.js`, which carries both, is identical to the published
  1.1.4. Maria's seeded rolls (`dice-engine.js`) reach into exactly that file.

A PBR theme's material:

| key                        | what it is                                                       |
| -------------------------- | ---------------------------------------------------------------- |
| `diffuseTexture.light/dark` | albedo; transparent where the player's colour shows             |
| `bumpTexture`              | normal map, as before                                            |
| `metallicTexture`          | glTF layout: red occlusion, green roughness, blue metalness       |
| `environmentIntensity`     | optional, default 1                                              |
| `directIntensity`          | optional, default 1                                              |
| `clearCoat`                | optional `{ intensity, roughness }`: a glossy layer over the lot |
| `opacity`                  | optional: see-through, for glass — see below                     |
| `accent`, `accentTexture` | optional: a second colour from the first — see below             |
| `parallax`                 | optional: depth, from a height in `bumpTexture`'s alpha          |

Five later additions:

- **Glass.** `opacity` is how much of what is behind the body it hides.
  Whatever the albedo paints over the body stays solid, so a glass die's
  numerals do not fade with it, and both sides are drawn, back first, so the
  far faces show through the near.
- **Glass casts a lighter shadow.** The directional light's shadow generator
  has `transparencyShadow` on, which only changes the shadow of a material
  that blends — so of an `opacity` theme alone.
- **A second colour, from the first.** A theme with an `accent` — the
  numbers `lib/dice-accent.mjs` in Maria works its own copy from — and an
  `accentTexture` paints a second colour wherever that texture's red says,
  worked out in the shader from the die's own body colour, so a player's
  colour comes with a partner whatever it is. A theme without one compiles
  the same shader as before.
- **Depth.** A theme with `parallax` keeps a height map in its normal map's
  alpha — 1 the highest — and Babylon's parallax occlusion looks into it,
  so raised work stands up and sunk work sinks as the die turns; `parallax`
  is how deep, in texture units. An accent texture is not offset with it.
- **A stopped die can be turned.** The offscreen worker answers
  `{ action: "turnDice", options: { x, y } }`, turning every die in the tray
  by `x` and `y` radians as a drag reads — rightward turns the near face
  right, downward turns it down — drawing it towards the middle of the tray
  and setting it back down on the floor it rested on. It does nothing while
  dice are still rolling. `DiceBox` has no method for it — `dice-box.es.js`
  stays upstream's — so the message goes straight to the worker, and a
  browser that renders on the main thread instead of in a worker cannot turn
  its dice.

## What is here

- `dist/` — the build, minus source maps and the minified duplicates nothing
  imports. `dist/assets/` is upstream's stock theme and Ammo, which
  `Maria/scripts/dice-assets.mjs` copies from.
- `grimoire.patch` — the whole change, against upstream's source at the
  published 1.1.4 (tagged `v1.1.14` upstream, a typo for `v1.1.4`).

## Rebuilding

```bash
git clone https://github.com/3d-dice/dice-box.git
cd dice-box
git checkout v1.1.14
git apply ../path/to/Maria/vendor/dice-box/grimoire.patch
npm ci --ignore-scripts
npm run build
```

Then copy `dice-box.es.js`, `world.none.js`, `world.onscreen.js`,
`world.offscreen.js` and `Dice.js` from its `dist/` into `dist/` here. An
unpatched build of that tag reproduces the published files exactly, which is
the check that the toolchain still does.
