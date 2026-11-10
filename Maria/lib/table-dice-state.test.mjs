import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { DEFAULT_DICE_COLOR, DICE_SKIN_VALUES } from "sina/rules/character";

const source = await readFile(
  new URL(
    "../app/dashboard/campaign/[id]/play/table-state.jsx",
    import.meta.url,
  ),
  "utf8",
);
const plain = source
  .slice(0, source.indexOf("export default function TableState"))
  .replace(
    /from "([^"]+)"/g,
    (_, specifier) => `from ${JSON.stringify(import.meta.resolve(specifier))}`,
  );
const { createTableStore } = await import(
  `data:text/javascript;base64,${Buffer.from(`${plain}\nexport { createTableStore };`).toString("base64")}`
);

const member = {
  id: "character",
  level: 1,
  dice_color: DEFAULT_DICE_COLOR,
  dice_skin: DICE_SKIN_VALUES[0],
};
const seed = () => ({ members: [member], combat: member });

test("live party reads adopt a saved skin without refreshing the route", () => {
  const store = createTableStore(seed());
  const before = store.read().diceLooks;
  const changed = { ...member, dice_skin: DICE_SKIN_VALUES[1] };
  store.sync({ party: [changed] }, Date.now());

  assert.notEqual(store.read().diceLooks, before);
  assert.deepEqual(store.read().diceLooks.character, {
    color: member.dice_color,
    skin: changed.dice_skin,
  });
});

test("health-only updates keep dice subscriptions stable", () => {
  const store = createTableStore(seed());
  const before = store.read().diceLooks;
  store.sync({ party: [{ ...member, current_hp: 1 }] }, Date.now());
  assert.equal(store.read().diceLooks, before);
});

test("unreadable dice values and unknown characters cannot replace known looks", () => {
  const store = createTableStore(seed());
  const before = store.read().diceLooks;
  store.sync(
    {
      party: [
        { ...member, dice_skin: "unknown" },
        { ...member, id: "other" },
      ],
    },
    Date.now(),
  );
  assert.equal(store.read().diceLooks, before);
});

test("campaign reads update the Dungeon Master's dice and tolerate older responses", () => {
  const store = createTableStore(seed());
  const changed = { ...member, dice_skin: DICE_SKIN_VALUES[1] };
  store.sync({ combat: changed }, Date.now());
  const look = store.read().headDiceLook;
  assert.equal(look.skin, changed.dice_skin);
  store.sync({ combat: { inCombat: false } }, Date.now());
  assert.equal(store.read().headDiceLook, look);
});

test("banner selections reach open party cards", () => {
  const store = createTableStore(seed());
  assert.equal(store.read().bannerSkins.character, "classic");
  store.sync(
    {
      party: [{ ...member, banner_skin: "dragon-lore" }],
    },
    Date.now(),
  );
  assert.equal(store.read().bannerSkins.character, "dragon-lore");
  const banners = store.read().bannerSkins;
  store.sync(
    {
      party: [{ ...member, banner_skin: "unknown" }],
    },
    Date.now(),
  );
  assert.equal(store.read().bannerSkins, banners);
  store.sync(
    {
      party: [{ ...member, banner_skin: "classic" }],
    },
    Date.now(),
  );
  assert.equal(store.read().bannerSkins.character, "classic");
});

for (const skin of ["splash", "hexagon"]) {
  test(`${skin} keeps its banner while live dice colours change for both seats`, () => {
    const initial = { ...member, banner_skin: skin };
    const store = createTableStore({ members: [initial], combat: initial });
    store.sync(
      {
        party: [{ ...initial, dice_color: "#2563eb" }],
        combat: { ...initial, dice_color: "#059669" },
      },
      Date.now(),
    );
    assert.equal(store.read().diceLooks.character.color, "#2563eb");
    assert.equal(store.read().headDiceLook.color, "#059669");
    assert.equal(store.read().bannerSkins.character, skin);
  });
}
