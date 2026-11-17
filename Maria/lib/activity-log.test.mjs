import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const dataModule = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const mocks = dataModule(`
  export const previews = [];
  export const useCallback = (callback) => callback;
  export const useTableStore = () => ({
    noteEntries: (entries) => previews.push(...entries),
    setActivity() {},
  });
  export const useTableDeed = () => ({ send() {}, resync() {} });
  export const recordActivity = async () => ({ activity: [] });
`);
const source = await readFile(
  new URL(
    "../app/dashboard/campaign/[id]/play/use-activity.js",
    import.meta.url,
  ),
  "utf8",
);
const { useActivityLog } = await import(
  dataModule(source.replace(/from "[^"]+"/g, `from "${mocks}"`))
);
const { previews } = await import(mocks);

test("pending activity keeps player portraits and the DM badge", async () => {
  const record = useActivityLog("campaign");
  const entry = { action: "dice_roll", die: "d20", value: 18 };
  await record("character", entry, { ...entry, actor: "Player" });
  await record(null, entry, { ...entry, actor: "Dungeon Master" });

  assert.deepEqual(
    previews.map(({ seat, head }) => ({ seat, head })),
    [
      { seat: "character", head: false },
      { seat: null, head: true },
    ],
  );
});
