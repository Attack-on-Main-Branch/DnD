import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(
  new URL(
    "../app/dashboard/campaign/[id]/play/use-dice-appearance.js",
    import.meta.url,
  ),
  "utf8",
);
const dataModule = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
let runs = 0;

async function appearance(t, display = false) {
  const refs = [];
  const effects = [];
  const messages = new Map();
  const sent = [];
  const reads = [];
  let cursor = 0;
  const prior = globalThis.diceAppearanceHarness;
  const state = {
    looks: { character: { color: "#e11d48", skin: "classic" } },
    head: { color: "#e11d48", skin: "classic" },
    useCallback: (callback) => callback,
    useEffect: (effect) => effects.push(effect),
    useRef: (initial) => (refs[cursor++] ??= { current: initial }),
    useDiceLooks: () => state.looks,
    useHeadDiceLook: () => state.head,
    useWireMessage: (kind, callback) => messages.set(kind, callback),
    useTableDeed: () => ({
      send: (message) => sent.push(message),
      resync: (want) => reads.push(want),
    }),
  };
  globalThis.diceAppearanceHarness = state;
  t.after(() => {
    globalThis.diceAppearanceHarness = prior;
  });
  const mock = dataModule(
    `export const {useCallback,useEffect,useRef,useDiceLooks,useHeadDiceLook,useWireMessage,useTableDeed}=globalThis.diceAppearanceHarness; // ${++runs}`,
  );
  const { useDiceAppearance: readDiceAppearance } = await import(
    dataModule(source.replace(/from "[^"]+"/g, `from ${JSON.stringify(mock)}`))
  );
  const render = () => {
    cursor = 0;
    const result = readDiceAppearance({
      campaignId: "campaign",
      characterId: "character",
      enabled: true,
      display,
    });
    for (const effect of effects.splice(0)) effect();
    return result;
  };
  render();
  return { state, render, messages, sent, reads };
}

test("a saved skin changes the local roll and rings the other chairs once", async (t) => {
  const board = await appearance(t);
  assert.equal(board.sent.length, 0);
  board.state.looks = { character: { color: "#e11d48", skin: "bone" } };
  assert.equal(board.render().appearance.skin, "bone");
  board.render();
  assert.deepEqual(board.sent, [{ kind: "dice" }]);
});

test("dice and rejoining messages re-read server values without trusting the message", async (t) => {
  const board = await appearance(t);
  board.messages.get("dice")({ skin: "untrusted" });
  board.messages.get("seat")({ characterId: "character" });
  assert.deepEqual(board.reads, [
    { party: true, combat: true },
    { party: true, combat: true },
  ]);
  assert.equal(board.render().appearance.skin, "classic");
});

test("the TV display adopts updated appearances without broadcasting them", async (t) => {
  const board = await appearance(t, true);
  board.state.looks = { character: { color: "#e11d48", skin: "bone" } };
  assert.ok(board.render().skins.includes("bone"));
  assert.equal(board.sent.length, 0);
});
