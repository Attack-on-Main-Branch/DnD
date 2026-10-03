import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { joinTable, watchBroadcast, watchTable } from "./realtime.js";

/**
 * What supabase-js does with topics, and nothing else: `channel()` hands back
 * the existing channel for a topic until its leave has been answered, and
 * `subscribe()` on one that is not closed does nothing at all.
 */
function fakeClient() {
  const channels = [];
  const leaving = [];

  return {
    channels,
    leaving,
    channel(topic) {
      const found = channels.find((one) => one.topic === topic);

      if (found) {
        return found;
      }

      const made = {
        topic,
        joins: 0,
        closed: true,
        on() {
          return this;
        },
        subscribe() {
          if (this.closed) {
            this.closed = false;
            this.joins += 1;
          }

          return this;
        },
        send: async () => "ok",
        track: async () => "ok",
        untrack: async () => "ok",
        presenceState: () => ({}),
      };

      channels.push(made);
      return made;
    },
    removeChannel(channel) {
      return new Promise((resolve) => {
        leaving.push(() => {
          channels.splice(channels.indexOf(channel), 1);
          resolve("ok");
        });
      });
    },
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

const quiet = { event: "roll", onMessage() {} };

describe("watchTable", () => {
  it("gives two watches under one name a channel each", () => {
    const client = fakeClient();

    watchTable(client, { channel: "party:1", table: "t", onChange() {} });
    watchTable(client, { channel: "party:1", table: "t", onChange() {} });

    assert.equal(client.channels.length, 2);
    assert.notEqual(client.channels[0].topic, client.channels[1].topic);
    assert.deepEqual(
      client.channels.map((one) => one.joins),
      [1, 1],
    );
  });
});

describe("watchBroadcast", () => {
  it("waits for a channel on its way out instead of joining it", async () => {
    const client = fakeClient();

    const first = watchBroadcast(client, { channel: "rolls:1", ...quiet });
    await settle();

    const old = client.channels[0];
    first.stop();

    watchBroadcast(client, { channel: "rolls:1", ...quiet });
    await settle();

    assert.equal(old.joins, 1);
    assert.equal(client.channels.length, 1);

    client.leaving.shift()();
    await settle();

    assert.equal(client.channels.length, 1);
    assert.notEqual(client.channels[0], old);
    assert.equal(client.channels[0].joins, 1);
  });

  it("never joins when stopped before its topic came free", async () => {
    const client = fakeClient();

    watchBroadcast(client, { channel: "rolls:1", ...quiet }).stop();
    await settle();

    assert.equal(client.channels.length, 0);
  });
});

describe("joinTable", () => {
  it("rejoins a table left a moment ago", async () => {
    const client = fakeClient();
    const table = {
      channel: "table:1",
      key: "seat",
      meta: {},
      event: "board",
      onChairs() {},
      onMessage() {},
    };

    joinTable(client, table).stop();
    await settle();

    const first = joinTable(client, table);
    await settle();
    first.stop();

    joinTable(client, table);
    client.leaving.shift()();
    await settle();

    assert.equal(client.channels.length, 1);
    assert.equal(client.channels[0].joins, 1);
  });
});
