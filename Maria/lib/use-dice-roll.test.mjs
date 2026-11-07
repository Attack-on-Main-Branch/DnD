import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(
  new URL(
    "../app/dashboard/campaign/[id]/play/use-dice-roll.js",
    import.meta.url,
  ),
  "utf8",
);
const dataModule = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
let runs = 0;

async function roller(t, options = {}) {
  const effects = [];
  const cleanups = [];
  const starts = [];
  const finishes = [];
  let engines = 0;
  const previous = globalThis.tableDiceHarness;
  globalThis.tableDiceHarness = {
    useState: (initial) => [
      typeof initial === "function" ? initial() : initial,
      () => {},
    ],
    useRef: (initial) => ({ current: initial }),
    useCallback: (callback) => callback,
    useEffect: (effect) => effects.push(effect),
    diceEngine: async () => {
      engines += 1;
      throw new Error("No renderer in numeric mode");
    },
  };
  t.after(() => {
    for (const cleanup of cleanups) cleanup?.();
    globalThis.tableDiceHarness = previous;
  });
  const id = ++runs;
  const react = dataModule(
    `export const {useState,useRef,useCallback,useEffect} = globalThis.tableDiceHarness; // ${id}`,
  );
  const engine = dataModule(
    `export const diceEngine = globalThis.tableDiceHarness.diceEngine; export const DICE_LANES=3; export const abandonDice=()=>{},clearDice=()=>{},diceGeneration=()=>0,releaseDice=()=>{},throwDie=()=>{throw new Error("Unexpected 3D roll")}; // ${id}`,
  );
  const patched = source
    .replace('"react"', JSON.stringify(react))
    .replace(
      '"sina/rules/dice"',
      JSON.stringify(import.meta.resolve("sina/rules/dice")),
    )
    .replace(
      '"@/app/components/use-reduced-motion"',
      JSON.stringify(dataModule("export const prefersReducedMotion=()=>true;")),
    )
    .replace('"./dice-engine"', JSON.stringify(engine))
    .replace(
      '"./crit-flare"',
      JSON.stringify(dataModule("export const flareCriticals=()=>{};")),
    )
    .replace(
      '"./dice-presentation"',
      JSON.stringify(
        dataModule("export const diceMaterial=()=>({}),dieNotation=()=>'';"),
      ),
    );
  const { useDiceRoll: readDiceRoll } = await import(dataModule(patched));
  const state = readDiceRoll({
    onStart: (value) => starts.push(value),
    onFinish: (value) => finishes.push(value),
    ...options,
  });
  for (const effect of effects) cleanups.push(effect());
  return { state, starts, finishes, engines: () => engines };
}

test("reduced-motion dice share numeric results without mirroring a 3D roll", async (t) => {
  const { state, starts, finishes, engines } = await roller(t);
  state.warm();
  await state.mirror("d20", 1, 7, {}, () =>
    assert.fail("Numeric mode must wait for the shared result"),
  );
  let landed;
  await state.roll("d20", 2, {
    onLanded: (value) => {
      landed = value;
    },
  });
  assert.equal(engines(), 0);
  assert.equal(starts.length, 1);
  assert.equal(starts[0].seed, null);
  assert.equal(finishes.length, 1);
  assert.equal(finishes[0].value, landed);
  assert.ok(Number.isInteger(landed) && landed >= 2 && landed <= 40);
  await state.roll("d6", 1);
  assert.equal(finishes.length, 2);
});

test("paused players cannot roll dice", async (t) => {
  const { state, starts, finishes, engines } = await roller(t, {
    enabled: false,
  });
  await state.roll("d20", 1);
  assert.equal(starts.length, 0);
  assert.equal(finishes.length, 0);
  assert.equal(engines(), 0);
});
