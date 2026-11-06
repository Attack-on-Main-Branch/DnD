import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { setImmediate as immediate } from "node:timers/promises";

const source = await readFile(
  new URL(
    "../app/dashboard/campaign/[id]/play/use-table-rolls.js",
    import.meta.url,
  ),
  "utf8",
);
const dataModule = (code) =>
  `data:text/javascript;base64,${Buffer.from(code + "\n//# sourceURL=table-rolls-test.mjs").toString("base64")}`;
let runs = 0;

async function table(t) {
  const slots = [];
  const scheduled = [];
  const cleanups = [];
  const mirrors = [];
  let cursor = 0;
  let mounting = true;
  let receive;
  const previous = globalThis.diceHookHarness;
  const harness = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (update) => {
          slots[index] =
            typeof update === "function" ? update(slots[index]) : update;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useCallback: (callback) => callback,
    useEffect(effect) {
      if (mounting) scheduled.push(effect);
    },
    realtime: async () => ({
      client: {},
      watchBroadcast(client, { onMessage }) {
        receive = onMessage;
        return { send() {}, stop() {} };
      },
    }),
  };
  globalThis.diceHookHarness = harness;
  t.after(() => {
    for (const cleanup of cleanups) cleanup?.();
    globalThis.diceHookHarness = previous;
  });
  const id = ++runs;
  const react = dataModule(
    `const h = globalThis.diceHookHarness; export const {useState,useRef,useCallback,useEffect} = h; // ${id}`,
  );
  const socket = dataModule(
    `export const realtime = globalThis.diceHookHarness.realtime; // ${id}`,
  );
  const patched = source
    .replace('"react"', JSON.stringify(react))
    .replace('"@/app/components/realtime"', JSON.stringify(socket))
    .replace(
      '"sina/rules/character"',
      JSON.stringify(import.meta.resolve("sina/rules/character")),
    )
    .replace(
      '"sina/rules/dice"',
      JSON.stringify(import.meta.resolve("sina/rules/dice")),
    );
  const { useTableRolls: readTableRolls } = await import(dataModule(patched));
  const render = () => {
    cursor = 0;
    const state = readTableRolls({
      campaignId: "campaign",
      enabled: true,
      keeper: false,
      onMirror: (die, count, seed, cast, land) => mirrors.push(land),
    });
    for (const effect of scheduled.splice(0)) cleanups.push(effect());
    mounting = false;
    return state;
  };
  render();
  await immediate();
  return {
    render,
    mirrors,
    receive: (message) =>
      receive({ key: "chair", die: "d20", count: 1, ...message }),
  };
}

test("a late mirror cannot overwrite the result already delivered by the roller", async (t) => {
  const board = await table(t);
  board.receive({ phase: "start", seed: 7 });
  board.receive({ phase: "done", value: 20 });
  board.mirrors[0](1);
  assert.equal(board.render().results.chair.value, 20);
});

test("a mirror from an older roll cannot finish a newer roll", async (t) => {
  const board = await table(t);
  board.receive({ phase: "start", seed: 7 });
  board.receive({ phase: "start", seed: 9 });
  board.mirrors[0](20);
  assert.equal(board.render().results.chair, undefined);
  assert.ok(board.render().flying.chair);
  board.mirrors[1](8);
  assert.equal(board.render().results.chair.value, 8);
});

test("the roller still corrects a mirror that finished before its closing message", async (t) => {
  const board = await table(t);
  board.receive({ phase: "start", seed: 7 });
  board.mirrors[0](20);
  board.receive({ phase: "done", value: 1 });
  assert.equal(board.render().results.chair.value, 1);
  assert.equal(board.render().latest.value, 1);
});

test("a stranded roll cannot reappear after its flight has expired", async (t) => {
  const board = await table(t);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  board.receive({ phase: "start", seed: 7 });
  t.mock.timers.tick(15000);
  board.mirrors[0](20);
  assert.equal(board.render().results.chair, undefined);
  assert.equal(board.render().flying.chair, undefined);
});
