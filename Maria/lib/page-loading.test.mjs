import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(
  new URL("../app/components/navigation-progress-control.js", import.meta.url),
  "utf8",
);
let runs = 0;
const loading = () =>
  import(
    `data:text/javascript;base64,${Buffer.from(`${source}\n// ${++runs}`).toString("base64")}`
  );

test("the wheel waits for the top bar's completion signal", async () => {
  const state = await loading();
  state.setNavigationProgressVisible(true);
  const ready = state.registerPageLoading();
  assert.equal(state.isPageLoading(), false);

  state.setNavigationProgressVisible(false);
  assert.equal(state.isPageLoading(), true);
  ready();
  assert.equal(state.isPageLoading(), false);
});

test("a page ready before the top bar ends never flashes the wheel", async () => {
  const state = await loading();
  const changes = [];
  state.subscribePageLoading(() => changes.push(state.isPageLoading()));
  state.setNavigationProgressVisible(true);
  const ready = state.registerPageLoading();
  ready();
  state.setNavigationProgressVisible(false);
  assert.deepEqual(changes, []);
});

test("overlapping loading boundaries wait for the final pending page", async () => {
  const state = await loading();
  const first = state.registerPageLoading();
  const second = state.registerPageLoading();
  first();
  first();
  assert.equal(state.isPageLoading(), true);
  second();
  assert.equal(state.isPageLoading(), false);
});

test("another navigation hides the wheel until its own bar has finished", async () => {
  const state = await loading();
  const previous = state.registerPageLoading();
  state.setNavigationProgressVisible(true);
  const next = state.registerPageLoading();
  previous();
  state.setNavigationProgressVisible(false);
  assert.equal(state.isPageLoading(), true);
  next();
  assert.equal(state.isPageLoading(), false);
});

test("loading subscribers receive only visibility changes and can unsubscribe", async () => {
  const state = await loading();
  const changes = [];
  const stop = state.subscribePageLoading(() =>
    changes.push(state.isPageLoading()),
  );
  const first = state.registerPageLoading();
  const second = state.registerPageLoading();
  first();
  assert.deepEqual(changes, [true]);
  stop();
  second();
  assert.deepEqual(changes, [true]);
});
