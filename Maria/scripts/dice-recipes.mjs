/**
 * What every painted dice skin is made of — its sizes, colours and finishes —
 * for scripts/dice-skins.mjs, which does the painting, and the `paint…`
 * functions the comments below point to live there.
 *
 * Data kept apart from code on purpose: scripts/dice-assets.mjs fingerprints
 * each skin by its own recipe and the painter by its source, so editing one
 * recipe repaints that skin alone, and editing the painter repaints them all.
 */

/**
 * One entry per generated theme folder. `frame` is a fraction of a d20 face's
 * inradius; `bevel`, `depth` and `shadow` are in frame widths; `weight` is how
 * many pixels the stock numerals are thickened by.
 *
 * Every theme is lit physically by the vendored dice-box (see
 * Maria/vendor/dice-box), so each recipe's `finish` is how ROUGH each of its
 * materials is, 0 a mirror and 1 chalk.
 */
const RIMMED = {
  frame: 0.24,
  bevel: 0.4,
  depth: 0.35,
  shadow: 0.7,
  weight: 1,
  fleck: { color: "#f4f0ff", density: 0.085 },
  finish: { metal: 0.14, enamel: 0.16, fleck: 0.1 },
};

/**
 * The three metals, once: a rimmed die and an inlaid one cast in the same
 * metal should be the same metal. Lit physically, the colour is also what the
 * metal tints every reflection with.
 */
const METALS = {
  metal: { metal: "#d5e0e4" },
  gold: { metal: "#e4c63f" },
  brass: { metal: "#bd6e25" },
};

/**
 * The house's own dice — obsidian, and the amethyst-lettered one the Dungeon
 * Master keeps back — and so every character's Classic: glossy plastic in the
 * body colour, with the numerals in metallic paint.
 */
export const HOUSE_FINISH = { body: 0.22, numerals: 0.35 };

/**
 * Metal with a ring of glittering resin sunk round a raised plate on every
 * face — see `carveInlay`. Sizes are fractions of a d20 face's inradius,
 * measured in from the face's edge; `margin` is how much plate the numerals
 * keep clear of the channel, and `wear.frame` how much of the plate's wear
 * the frame shows.
 */
const INLAID = {
  kind: "inlaid",
  frame: 0.15,
  channel: 0.2,
  depth: 0.35,
  engrave: 0.05,
  margin: 0.07,
  weight: 1,
  numerals: "#15130f",
  wear: { frame: 0.35, tone: 0.2, brush: 0.1, scratches: 14, grime: 0.45 },
  fleck: {
    density: 0.22,
    colors: ["#ffffff", "#e6ccff", "#bcd8ff", "#ffc8ee"],
  },
  // The polish the wear in `paintInlaid` roughens from.
  finish: {
    frame: 0.12,
    plate: 0.2,
    bevel: 0.14,
    resin: 0.08,
    fleck: 0.1,
    foil: 0.55,
    numerals: 0.5,
  },
};

/**
 * Metal with a raised rim round every face and a bracket in each of its
 * corners, the enamel between them swirled in the player's colour — see
 * `carveCornered` and `paintCornered`. Sizes are fractions of a d20 face's
 * inradius: `frame` is the rim, `bevel` how far it rounds over into the
 * enamel, `depth` how far the metal stands proud of it. A bracket stands
 * `gap` in from the rim, `width` wide, its arms `arm` long or `reach` of
 * their edge if that is shorter, and `height` of the rim's height; `margin`
 * is the enamel the numerals keep clear round them. `shadow` is in atlas
 * pixels. The enamel is marbled by noise `scale` across, warped by `warp`:
 * how much darker and paler it goes, how far the shadow of the metal darkens
 * it, and its pearly streaks — `streak` wide, `pearl` bright, with
 * `sheen` of a metal's shine in them.
 */
const CORNERED = {
  kind: "cornered",
  frame: 0.1,
  bevel: 0.05,
  depth: 0.07,
  bracket: { gap: 0.15, width: 0.2, arm: 0.75, reach: 0.4, height: 0.85 },
  margin: 0.05,
  weight: 1,
  shadow: 3,
  enamel: {
    scale: 2.2,
    warp: 1.1,
    dark: 0.35,
    light: 0.25,
    shadow: 0.6,
    streak: 0.02,
    pearl: 0.12,
    sheen: 0.25,
  },
  finish: { metal: 0.16, enamel: 0.14 },
};

export const DICE_SKIN_RECIPES = {
  "metal-rimmed": { ...RIMMED, ...METALS.metal, name: "Metal-rimmed" },
  "gold-rimmed": { ...RIMMED, ...METALS.gold, name: "Gold-rimmed" },
  "brass-rimmed": { ...RIMMED, ...METALS.brass, name: "Brass-rimmed" },

  "metal-inlaid": { ...INLAID, ...METALS.metal, name: "Metal-inlaid" },
  "gold-inlaid": { ...INLAID, ...METALS.gold, name: "Gold-inlaid" },
  "brass-inlaid": { ...INLAID, ...METALS.brass, name: "Brass-inlaid" },

  "metal-cornered": { ...CORNERED, ...METALS.metal, name: "Metal-cornered" },
  "gold-cornered": { ...CORNERED, ...METALS.gold, name: "Gold-cornered" },
  "brass-cornered": { ...CORNERED, ...METALS.brass, name: "Brass-cornered" },

  /*
   * Resin over crumpled foil — see `paintEpoxy`. Sizes are fractions of a d20
   * face's inradius, like the frame above; the alphas are how far each layer
   * takes the player's colour towards black or white.
   */
  epoxy: {
    kind: "epoxy",
    name: "Epoxy",
    weight: 1,
    engrave: 0.05,
    resin: { depth: 0.42, edge: 0.4, rim: 0.3 },
    foil: {
      shard: 0.42,
      clump: 1.6,
      coverage: 0.85,
      light: 0.24,
      dark: 0.5,
      crease: 0.05,
      tilt: 0.8,
    },
    fleck: {
      density: 0.055,
      colors: [
        "#8dffbf",
        "#7ae8ff",
        "#9aa8ff",
        "#e19bff",
        "#ff9ccf",
        "#ffe48f",
      ],
    },
    metal: "#d9ac3f",
    // Under the coat: foil, the resin it floats in, glitter, gilt numerals.
    finish: { foil: 0.16, resin: 0.3, fleck: 0.1, numerals: 0.3 },
    // The resin's own surface, over all of it.
    coat: { intensity: 1, roughness: 0.04 },
  },

  /*
   * Folded from a sheet and drawn on in pen — see `paintPaper`. Sizes are
   * fractions of a d20 face's inradius; `wobble` is in atlas pixels. The
   * numerals are written `width` wide, pressed harder and lighter by up to
   * `pressure` over `scale`, with a `blot` at each stroke's end, as a share
   * of the line. The sheet is clouded `strength` over `scale`; its
   * `fibres` run `ways` ways, `width` by `length`, showing where noise is
   * between `from` and `to`, `strength` lighter or darker and `depth` proud;
   * `flecks` of pulp are `scale` across and `strength` dark.
   */
  paper: {
    kind: "paper",
    name: "Paper",
    paper: "#f6f1e4",
    pen: { outline: 0.07, wander: 0.6 },
    sketch: { inset: 0.2, width: 0.045, gap: 0.9, lift: 0.2 },
    wobble: { amplitude: 1.1, cell: 12 },
    numerals: { width: 0.13, pressure: 0.5, scale: 0.4, blot: 1.5 },
    creases: { count: 3, width: 0.07, depth: 0.01 },
    cloud: { scale: 0.7, strength: 0.06 },
    fibres: {
      ways: 4,
      width: 0.012,
      length: 0.35,
      from: 0.78,
      to: 0.9,
      strength: 0.035,
      depth: 0.002,
    },
    flecks: { scale: 0.05, strength: 0.25 },
    grain: 0.14,
    finish: { paper: 0.9, ink: 0.45 },
  },

  /*
   * Black, split by glittering cracks — see `paintCracked`. Sizes are
   * fractions of a d20 face's inradius; `clearance` is how many atlas pixels
   * the cracks keep off the numerals.
   */
  cracked: {
    kind: "cracked",
    name: "Cracked",
    weight: 1,
    black: "#0e0e11",
    numerals: "#f3f1ec",
    crack: {
      cell: 2.5,
      warp: 0.5,
      swirl: 0.4,
      width: 0.4,
      depth: 0.4,
      keep: 0.85,
      clearance: 4,
    },
    fleck: {
      density: 0.16,
      colors: ["#ffffff", "#ffffff", "#d2c4ff", "#a9dcff"],
    },
    finish: { black: 0.45, resin: 0.08, fleck: 0.1, numerals: 0.35 },
  },

  /*
   * White plastic panelled in black and the player's colour, after a
   * well-known rifle finish — see `paintAsiimov`. `cap` is how far each
   * corner's cut reaches towards the middle of the faces meeting there, and
   * `spread` the most a cap may fall short of that. `crowded` gives a die
   * whose corners sit too close together for `cap` — the d12's would meet
   * along every edge — a cap of its own. `corners` is the order
   * the caps are dealt round the dice, and `edges` how often each marking is
   * picked for an edge. The other sizes are fractions of a d20 face's
   * inradius; `clearance` and `bleed` are atlas pixels — how far markings
   * keep off the numerals, and how far the faces' paint is carried out over
   * the gutters.
   */
  asiimov: {
    kind: "asiimov",
    name: "Asiimov",
    weight: 1,
    cap: 0.4,
    crowded: { d12: 0.2 },
    spread: 0.3,
    corners: [
      "accent",
      "split",
      "black",
      "chevron",
      "accent",
      "hazard",
      "plain",
      "banded",
      "black",
    ],
    edges: { rail: 3, bar: 2, ticks: 2, hazard: 2, none: 1 },
    outline: 0.1,
    echo: { gap: 0.07, width: 0.022 },
    rim: { inset: 0.07, width: 0.022 },
    split: 0.16,
    chevron: [0.08, 0.2],
    stripes: 0.16,
    rail: { inset: 0.14, width: 0.045 },
    bar: { depth: 0.11, gap: 0.06, width: 0.04, share: 0.75 },
    ticks: { inset: 0.1, height: 0.15, pitch: 0.07, length: 1 },
    hazard: { inset: 0.08, height: 0.2, pitch: 0.16, length: 1 },
    clearance: 3,
    margin: 0.2,
    depth: 0.04,
    groove: 0.02,
    engrave: 0.03,
    bleed: 8,
    colours: {
      white: "#eeece8",
      black: "#1c1d21",
      line: "#2a2b30",
      rim: "#8a8d94",
      numerals: "#141416",
    },
    finish: { white: 0.5, accent: 0.45, black: 0.38, numerals: 0.45 },
  },

  /*
   * Striped hardwood with burnt-in numerals — see `paintWood`. Sizes are
   * fractions of a d20 face's inradius: `period` is roughly a stripe and its
   * gap, `warp` how far the stripes wander and `bend` how long a wander is,
   * `fibre` and `run` a fibre's width and length. `width` is the share of
   * each ring that is dark stripe, least and most, `edge` how sharply a
   * stripe ends and `feather` how far its edge frays down the fibres, as
   * shares of a ring, and `pores` the share of pixels pricked. `patch` is the
   * broad darker regions: their size along and across the grain, where on
   * their noise they begin and are fully dark, and how dark that is.
   */
  wood: {
    kind: "wood",
    name: "Wood",
    weight: 1,
    engrave: 0.06,
    bleed: 8,
    grain: {
      along: [0.35, 1, 0.2],
      period: 0.75,
      warp: 1.1,
      bend: 2.8,
      fibre: 0.035,
      run: 1.2,
      width: [0.25, 0.85],
      edge: 0.18,
      feather: 0.12,
      pores: 0.02,
      texture: 0.004,
      patch: { along: 5, across: 1.2, from: 0.22, to: 0.78, strength: 0.9 },
    },
    colours: {
      light: "#c8954d",
      mid: "#94602c",
      deep: "#5c3817",
      dark: "#3a200d",
      char: "#1f1008",
      scorch: "#3a1f0e",
    },
    finish: { wood: 0.6, stripe: 0.52, numerals: 0.85 },
  },

  /*
   * Slate panels in white plastic, lit through by the player's colour — see
   * `paintCompanion`. Sizes across a face are fractions of that die's face
   * inradius; `reach` is a share of the edge, measured from each corner for
   * an arm and centred for a bar. `taper` is how much narrower an arm ends
   * than it starts; `central` how near a face's middle a numeral must sit to
   * have the middle disc; `ridge` how steeply an arm climbs to its edge;
   * `dice` is a die's own arms, bars or discs. `join` and `shadow` are atlas
   * pixels — how far apart a numeral's digits may be, and how far a piece's
   * shadow falls. `bump` is how strongly the relief is lit: the white stands
   * well proud of the slate, and the colour sinks into it. `parallax` is how
   * deep the relief looks as the die turns — see the vendored dice-box.
   */
  companion: {
    kind: "companion",
    name: "Companion",
    parallax: 0.016,
    weight: 1,
    join: 4,
    shadow: 5,
    bump: 2.2,
    bleed: 8,
    arm: { reach: 0.3, width: 0.36, taper: 0.3 },
    bar: { reach: 0.24, width: 0.17, ribs: 2 },
    line: 0.07,
    disc: {
      radius: 0.6,
      corner: 0.46,
      hub: 0.2,
      central: 0.5,
      margin: 0.05,
      ring: 0.06,
      gap: 0.1,
    },
    // A d4's numerals sit in its corners, so its corners keep to the tips.
    dice: { d4: { arm: { reach: 0.15, width: 0.2 } } },
    heart: 0.62,
    relief: {
      piece: 0.24,
      bevel: 0.11,
      ridge: 0.6,
      rib: 0.03,
      disc: 0.04,
      channel: 0.09,
      wall: 0.03,
    },
    colours: { white: "#ecebe6", slate: "#64738a", disc: "#ebe5d5" },
    finish: { white: 0.55, slate: 0.5, disc: 0.5, glow: 0.3 },
  },

  /*
   * Polished crystal in the player's colour, opaque, with chipped corners and
   * gold-leaf numerals — see `paintCrystal`. A chipped corner's `run` is how
   * far along each edge from it the cut reaches, as a share of the edge, least
   * and most; `sink` how far its tip is sunk, as a share of that reach; `keep`
   * the share of corners chipped. `knap` breaks every face into flat chips:
   * `cell` is about one chip across, as a share of how far the face reaches
   * from its middle; `dome` how steeply the chips at its rim lean out, `tilt`
   * how far each is turned at random, and `lift` how unevenly they are sized.
   * `facets` is how far each chip's tone
   * strays, and `depth` how much darker the colour is taken — throughout, and
   * more towards each face's edge. `environment` is how strongly it reflects
   * the room, `gilt` how much of a metal the gold leaf is — all metal reads
   * dark in a dark room — and `bump` how strongly the chips are lit.
   */
  crystal: {
    kind: "crystal",
    name: "Crystal",
    weight: 1,
    engrave: 0.05,
    metal: "#e2b54c",
    gilt: 0.55,
    bump: 2.2,
    bleed: 8,
    chips: { run: [0.2, 0.55], sink: [0.45, 0.85], keep: 1 },
    knap: { cell: 0.5, dome: 0.35, tilt: 0.3, lift: 0.8 },
    facets: 0.16,
    depth: { body: 0.2, edge: 0.3 },
    environment: 2.2,
    finish: { glass: 0.03, numerals: 0.32 },
    coat: { intensity: 1, roughness: 0 },
  },

  /*
   * Acrylic swirled from the player's colour into a darker shade of it, with
   * mica, glitter and gold-inked numerals — see `paintFade`. `swirl` sizes
   * the noise that pushes the fade about, in d20 face inradii, and how far it
   * warps; `fade` is how far each die runs dark across, how much the noise
   * moves the line, how much finer noise (`grain` across) frays it, how soft
   * it is and how dark the far side goes. `sheen` is the mica streaks.
   */
  fade: {
    kind: "fade",
    name: "Fade",
    weight: 1,
    engrave: 0.05,
    bleed: 8,
    metal: "#e8c25a",
    gilt: 0.5,
    swirl: { scale: 1.6, warp: 0.9 },
    fade: {
      slope: 0.9,
      noise: 1.3,
      fray: 0.5,
      grain: 0.18,
      edge: 0.18,
      depth: 0.62,
    },
    sheen: { width: 0.05, strength: 0.14 },
    fleck: {
      density: 0.05,
      colors: ["#ffffff", "#f6eaff", "#d9ecff", "#ffe9f6"],
    },
    finish: { acrylic: 0.22, fleck: 0.1, numerals: 0.4 },
    coat: { intensity: 0.6, roughness: 0.08 },
  },

  /*
   * A spiral galaxy in resin, in the player's colour, lettered in copper —
   * see `paintGalaxy`. `galaxy` sizes are shares of a die's reach from its
   * middle: the disc's `thickness` and `size`, its `core`, and `cloud` the
   * dust in it; `arms` and `twist` wind the spiral. `steps` is how many
   * samples each ray takes going in, `absorb` how much a bright patch hides
   * what is behind it, `gain` how bright a die's typical patch reads, `contrast` how much
   * brighter its bright patches are, and `nebula` where the
   * colour gives way to white. `space` is how near black the dark is, `core`
   * how white the brightest, `dust` the share of pixels that are faint stars.
   */
  galaxy: {
    kind: "galaxy",
    name: "Galaxy",
    weight: 1,
    engrave: 0.06,
    bleed: 8,
    metal: "#c8794b",
    gilt: 0.6,
    space: 0.9,
    core: 0.55,
    dust: 0.005,
    galaxy: {
      steps: 18,
      arms: 2,
      twist: 2.4,
      thickness: 0.22,
      size: 0.75,
      core: 0.16,
      cloud: 0.35,
      haze: 0.15,
      bright: 1.2,
      absorb: 0.8,
      gain: 0.28,
      contrast: 1.6,
      nebula: 0.75,
    },
    fleck: { density: 0.016 },
    finish: { resin: 0.08, fleck: 0.1, numerals: 0.35 },
    coat: { intensity: 1, roughness: 0.03 },
  },

  /*
   * Black plastic carved in relief, the raised work in the player's colour —
   * see `paintOrnate`. Sizes are fractions of that die's face inradius: the
   * black `border` along each edge, the line cut round the panel `inset` from
   * it, the cut lines' width; the filigree's noise `scale`, how many contours
   * (`bands`) it is cut along, their `width` and how far they keep `clear`
   * of the rim and the discs. A disc's `ring` is the paint left round it.
   */
  ornate: {
    kind: "ornate",
    name: "Ornate",
    weight: 1,
    join: 4,
    bleed: 8,
    panel: { border: 0.16, inset: 0.08, line: 0.035 },
    filigree: { scale: 0.24, bands: 5, width: 0.04, clear: 0.05 },
    disc: { radius: 0.46, corner: 0.4, margin: 0.06, ring: 0.09 },
    relief: { height: 0.04, wash: 0.25 },
    colours: { black: "#121214" },
    finish: { black: 0.32, paint: 0.5 },
  },

  /*
   * Case-hardened steel, after a well-known rifle finish — see
   * `paintCaseHardened`. `blue` is the share of the steel, by area, that comes
   * out blue; `fringe` the share either side of its edge the violet and
   * bronze take. `mottle` sizes the patches in d20 face inradii and how far
   * they are warped; `cloud` and `spots` are finer noise breaking the blue and
   * the gold up, and `grain` the steel's own texture. `metal` is how much of
   * a metal it is lit as — all metal reads dark in a dark room.
   */
  "case-hardened": {
    kind: "case-hardened",
    name: "Case Hardened",
    weight: 1,
    engrave: 0.06,
    bleed: 8,
    blue: 0.45,
    fringe: 0.085,
    mottle: { scale: 1.7, warp: 0.55, octaves: 3 },
    cloud: { scale: 0.75, dark: 0.4, light: 0.45 },
    spots: { scale: 0.12, strength: 0.35 },
    grain: 0.004,
    metal: 0.7,
    colours: {
      deep: "#2552b0",
      blue: "#3d7fd6",
      sky: "#86c0ec",
      violet: "#7a5cc4",
      magenta: "#b066a8",
      bronze: "#c08a44",
      gold: "#d8b84e",
      straw: "#e8db8a",
      amber: "#cf8a3a",
      numerals: "#121419",
    },
    finish: { steel: 0.42, numerals: 0.6 },
  },

  /*
   * Polished labradorite, grey stone washed with a soft flash of blue, teal
   * and gold, lettered in gold leaf — see `paintLabradorite`. Each die's two
   * sets of `lamellae` each `lean` off one face's normal; which holds sway
   * turns gradually over `blend` of noise about `scale` across, and wavers by
   * up to `waver`. `schiller` is how near a face must look along them to
   * flash, `from` least to `to` full, with a `floor` it never falls below;
   * `patch` where on its noise the flash begins and is whole, `strength` how
   * much of the stone it covers there, `glow` how much paler it is at its
   * brightest, and `tilt` how far the lamellae's normal may lean off the
   * face's in the normal map. `silk` is the grain through it, `across` and
   * `along` in size and `strength` in brightness. `hairlines` are the
   * cleavages: `count` ways across, `spacing` apart, `width` wide, `broken`
   * the size of their gaps, `depth` how far they are cut in. `mottle` is
   * the darker, flecked stone, `specks` the size of a fleck. Sizes are in d20
   * face inradii. `hue` is the ramp the flash takes, by share of the dice.
   * `sheen` is how much of a metal the flash is lit as.
   */
  labradorite: {
    kind: "labradorite",
    name: "Labradorite",
    weight: 1,
    engrave: 0.05,
    bleed: 8,
    metal: "#e6b545",
    gilt: 0.6,
    sheen: 0.2,
    environment: 1.3,
    lamellae: { lean: 0.35, scale: 2.2, blend: [0.35, 0.65], waver: 0.3 },
    schiller: {
      from: 0.3,
      to: 0.95,
      floor: 0.4,
      scale: 1.6,
      warp: 0.5,
      patch: [0.28, 0.6],
      strength: 0.92,
      glow: 0.3,
      tilt: 0.45,
    },
    silk: { across: 0.05, along: 0.8, strength: 0.18 },
    hairlines: {
      count: 3,
      spacing: 0.3,
      width: 0.008,
      broken: 0.6,
      depth: 0.02,
      strength: 0.25,
      colour: "#34404a",
    },
    mottle: {
      scale: 0.8,
      from: 0.66,
      to: 0.82,
      strength: 0.4,
      specks: 0.03,
      colour: "#353b3c",
    },
    hue: {
      scale: 2.2,
      warp: 0.6,
      stops: [
        [0, "#8a6ad0"],
        [0.06, "#4f6fe0"],
        [0.22, "#3a8ae8"],
        [0.45, "#4cb2f0"],
        [0.66, "#4fc8cc"],
        [0.8, "#78cc96"],
        [0.89, "#c4d45e"],
        [0.95, "#f2c84a"],
        [1, "#f5a64a"],
      ],
    },
    stone: {
      scale: 1.1,
      dark: "#2c3437",
      light: "#58656b",
      haze: "#a7b3b8",
      mist: 0.18,
    },
    finish: { stone: 0.42, flash: 0.3, cracks: 0.2, numerals: 0.32 },
    coat: { intensity: 0.8, roughness: 0.1 },
  },

  /*
   * Overlapping dragon scales in two colours, the player's and the accent
   * worked out from it — see `paintScales` and lib/dice-accent.mjs — with
   * raised gold numerals. `accent` asks scripts/dice-assets.mjs for the
   * fourth map and the numbers the vendored dice-box needs. `toward` is the
   * way the scales' tips point, through the die. Sizes are in d20 face
   * inradii: a scale is `width` by `length` and stands `depth` at its tip;
   * `keel` is how wide its ridge is, as a share of its width, and `ridge`
   * how high, of its depth; `round` how far its edge rounds over and
   * `shadow` how far it shadows the scale beneath, as shares of its width.
   * `shade` darkens its tucked-in top, `tone` varies one from the next,
   * `sheen` lights its keel, and the numerals stand `numerals` of its depth.
   * The accent takes the scales where noise `scale` across is over `from`,
   * and `stray` of the rest. `lacquer` is how much of a metal the scales are
   * lit as, `gilt` the numerals.
   */
  dragonscale: {
    kind: "scales",
    name: "Dragonscale",
    accent: true,
    weight: 1,
    bleed: 8,
    metal: "#e2b850",
    gilt: 0.85,
    lacquer: 0.35,
    toward: [0.2, -1, 0.15],
    scale: {
      width: 0.6,
      length: 0.85,
      depth: 0.1,
      keel: 0.16,
      ridge: 0.3,
      round: 0.1,
      shadow: 0.14,
      shade: 0.55,
      tone: 0.14,
      sheen: 0.5,
      numerals: 1.4,
    },
    patch: { scale: 1.2, from: 0.55, stray: 0.05 },
    finish: { scales: 0.3, numerals: 0.3 },
  },

  /*
   * Battered silver spattered with blood in the player's colour, lettered in
   * black enamel — see `paintBloodied` and `scatterDroplets`. Sizes are in
   * d20 face inradii. `facets` are the hammered mosaic, `scale` across, each
   * leaning by up to `tilt` and toned by up to `tone`, split by cracks
   * `crack` wide and `dark` darker; `dents` are `scale` across and `depth` deep; `scratches`
   * are `count` lines broken into `pieces`. `wear` polishes `edge` in from
   * every edge and tarnishes patches `scale` across by up to `tarnish`. The
   * blood comes as `splashes` — a core of `blobs` about `radius` across,
   * `tendrils` shot `length` radii out of it, and `drops` flung `spread`
   * radii, `small` across and drawn out by up to `stretch` — single `drops`
   * and a fine `mist`, each at a `density` per square inradius. Blobs run
   * together where their summed field passes `threshold`, `ragged` at the
   * edge by noise `scale` across; `dome` is how high the thickest blood
   * stands, `rim` how much darker it is at its edge, and `numerals` how much
   * of the black shows through it. `metal` is how much
   * of a metal the silver is lit as.
   */
  bloodied: {
    kind: "bloodied",
    name: "Bloodied",
    weight: 1,
    engrave: 0.06,
    bleed: 8,
    silver: "#c9cacd",
    numerals: "#0e0e10",
    metal: 0.8,
    environment: 1.3,
    facets: { scale: 0.28, tilt: 0.12, tone: 0.12, crack: 0.008, dark: 0.22 },
    dents: { scale: 0.9, depth: 0.03 },
    scratches: { count: 30, pieces: 0.35 },
    wear: { edge: 0.12, scale: 0.8, tarnish: 0.3 },
    blood: {
      splashes: {
        density: 0.09,
        radius: [0.25, 0.45],
        blobs: [4, 8],
        tendrils: [3, 6],
        length: [1, 2.2],
        drops: [14, 28],
        spread: [1.3, 3.4],
        small: [0.05, 0.11],
        stretch: 2.5,
      },
      drops: { density: 1, radius: [0.05, 0.12] },
      mist: { density: 4, radius: [0.03, 0.05] },
      threshold: 0.35,
      ragged: { scale: 0.07, strength: 0.3 },
      dome: 0.05,
      rim: 0.35,
      numerals: 0.65,
    },
    finish: { silver: 0.32, blood: 0.06, numerals: 0.25 },
  },

  pearl: {
    kind: "pearl",
    name: "Marble",
    weight: 1,
    engrave: 0.05,
    bleed: 8,
    numerals: "#f4f6f8",
    flow: {
      scale: 1.6,
      frequency: 0.85,
      warp: 0.25,
      drift: 0.35,
      vortices: [
        { centre: [-0.7, 0.4], radius: 2.2, turns: 4.5 },
        { centre: [1.1, -0.8], radius: 1.5, turns: -3.2 },
      ],
    },
    ribbon: { shadow: 0.75, light: 0.08, sheen: 0.24, silk: 0.08, tilt: 0.18 },
    finish: { resin: 0.12, pearl: 0.2, metal: 0.18, numerals: 0.4 },
    coat: { intensity: 1, roughness: 0.025 },
  },

  /*
   * See-through glass in the player's colour, misted and lightly scratched,
   * with frosted numerals — see `paintGlass`. `opacity` is how much of what
   * is behind the glass it hides, for the vendored dice-box. `mist` is a milky
   * `base` over all of it and drifts of up to `strength` more, `size` across;
   * `scratch.length` is roughly how long an unbroken run is and `depth` how far
   * one is cut in. Sizes are in d20 face inradii.
   */
  glass: {
    kind: "glass",
    name: "Glass",
    weight: 1,
    engrave: 0.05,
    numerals: "#f4f6f8",
    opacity: 0.6,
    environment: 1.6,
    mist: { size: 1.4, base: 0.16, strength: 0.14 },
    scratch: { count: 12, length: 0.5, strength: 0.14, depth: 0.003 },
    finish: { glass: 0.06, mist: 0.18, scratch: 0.4, numerals: 0.45 },
    coat: { intensity: 1, roughness: 0.01 },
  },
};
