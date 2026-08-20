import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import {
  acceptCampaignInvite,
  announceVersion,
  declineCampaignInvite,
  dismissNotification,
  latestAnnouncedVersion,
  listNotifications,
  markAnnouncementsRead,
  sendCampaignInvite,
} from "./notifications.js";

const ARGS = { id: "6f1c3d2e-0000-4000-8000-000000000000", userId: "user-1" };

/**
 * The tokens the migration's functions raise. These arrive as P0001 with the
 * token in the message, so the mapping is on the string and breaks silently if
 * the migration changes one — which is what this table is here to catch.
 */
const RAISED = [
  ["campaign_not_found", "campaign_not_found"],
  ["character_not_found", "character_not_found"],
  ["already_added", "already_added"],
  ["party_limit_reached", "party_full"],
  ["invite_pending", "invite_pending"],
  ["invite_not_found", "invite_not_found"],
  ["announce_limit_reached", "announce_limit_reached"],
  ["invalid_version", "invalid_version"],
  ["not_signed_in", "not_signed_in"],
];

describe("classify, through sendCampaignInvite", () => {
  for (const [token, reason] of RAISED) {
    it(`maps the raised ${token} to ${reason}`, async () => {
      const { data, error } = await sendCampaignInvite(
        stubQuery(
          postgrestError("P0001", `${token}\nCONTEXT: PL/pgSQL function`),
        ),
        { campaignId: "c-1", characterId: "ch-1" },
      );

      assert.equal(data, null);
      assert.equal(error.reason, reason);
    });
  }

  const SQLSTATES = [
    ["23514", "invalid_value", "copy longer than the CHECK allows"],
    ["42P01", "missing_table", "migrations not applied"],
    ["42883", "missing_function", "the RPC is not there"],
    ["22P02", "bad_id", "a junk id against a uuid argument"],
  ];

  for (const [code, reason, why] of SQLSTATES) {
    it(`maps ${code} to ${reason} (${why})`, async () => {
      const { error } = await sendCampaignInvite(
        stubQuery(postgrestError(code)),
        { campaignId: "c-1", characterId: "ch-1" },
      );

      assert.equal(error.reason, reason);
    });
  }

  it("falls back to unknown for a code it has no answer for", async () => {
    const { error } = await sendCampaignInvite(
      stubQuery(postgrestError("42501")),
      {
        campaignId: "c-1",
        characterId: "ch-1",
      },
    );

    assert.equal(error.reason, "unknown");
  });

  it("keeps the raw message as detail, for the log rather than the user", async () => {
    const { error } = await sendCampaignInvite(
      stubQuery(postgrestError("42501", "permission denied for function")),
      { campaignId: "c-1", characterId: "ch-1" },
    );

    assert.equal(error.detail, "permission denied for function");
  });
});

describe("the RPC calls name what the migration declares", () => {
  it("sends an invitation by campaign and character", async () => {
    const query = stubQuery({ data: "n-1", error: null });
    const { data } = await sendCampaignInvite(query, {
      campaignId: "c-1",
      characterId: "ch-1",
    });

    assert.deepEqual(query.lastRpc, {
      name: "send_campaign_invite",
      params: { p_campaign_id: "c-1", p_character_id: "ch-1" },
    });
    assert.deepEqual(data, { id: "n-1" });
  });

  it("accepts by notification, and reports the campaign joined", async () => {
    const query = stubQuery({ data: "c-1", error: null });
    const { data } = await acceptCampaignInvite(query, ARGS.id);

    assert.deepEqual(query.lastRpc, {
      name: "accept_campaign_invite",
      params: { p_notification_id: ARGS.id },
    });
    assert.deepEqual(data, { campaignId: "c-1" });
  });

  it("announces a version with the copy Maria wrote", async () => {
    const query = stubQuery({ data: "n-2", error: null });
    const { data } = await announceVersion(query, {
      version: "0.9.0",
      title: "New Grimoire Version (v0.9.0)",
      message: "Sealed missives.",
    });

    assert.deepEqual(query.lastRpc, {
      name: "announce_version",
      params: {
        p_version: "0.9.0",
        p_title: "New Grimoire Version (v0.9.0)",
        p_message: "Sealed missives.",
      },
    });
    assert.deepEqual(data, { id: "n-2" });
  });

  it("reports an already-announced version as nothing done, not as a failure", async () => {
    // `on conflict do nothing` returns no id. Calling it twice is the ordinary
    // outcome of two tabs, and must not surface as an error.
    const { data, error } = await announceVersion(
      stubQuery({ data: null, error: null }),
      { version: "0.9.0", title: "t", message: "m" },
    );

    assert.equal(data, null);
    assert.equal(error, null);
  });
});

describe("the query shape itself", () => {
  it("never selects user_id", async () => {
    const query = stubQuery({ data: [], error: null });
    await listNotifications(query, ARGS.userId);

    assert.ok(!query.lastSelect.includes("user_id"));
  });

  it("scopes the list to the caller and hides what was swept away", async () => {
    const query = stubQuery({ data: [], error: null });
    await listNotifications(query, ARGS.userId);

    assert.deepEqual(query.filters, [
      ["user_id", ARGS.userId],
      ["status", "dismissed", "neq"],
    ]);
    assert.equal(query.lastLimit, 30);
  });

  it("reads the announced version past a dismissal", async () => {
    // Deliberately NOT filtered by status: a dismissed announcement is still
    // the record of what its reader has been told, and filtering it out here
    // would announce the same release again on the next page load.
    const query = stubQuery({
      data: { data: { version: "0.9.0" } },
      error: null,
    });
    const { data } = await latestAnnouncedVersion(query, ARGS.userId);

    assert.deepEqual(query.filters, [
      ["user_id", ARGS.userId],
      ["type", "system_changelog"],
    ]);
    assert.equal(data, "0.9.0");
  });

  it("reports no announcement at all as null rather than as a failure", async () => {
    const { data, error } = await latestAnnouncedVersion(
      stubQuery({ data: null, error: null }),
      ARGS.userId,
    );

    assert.equal(data, null);
    assert.equal(error, null);
  });

  it("declines only an invitation still pending", async () => {
    const query = stubQuery({ data: [{ id: ARGS.id }], error: null });
    await declineCampaignInvite(query, ARGS);

    assert.deepEqual(query.lastUpdate, { status: "declined" });
    assert.deepEqual(query.filters, [
      ["id", ARGS.id],
      ["user_id", ARGS.userId],
      ["type", "campaign_invite"],
      ["status", "pending"],
    ]);
  });

  it("reads announcements and leaves invitations waiting", async () => {
    const query = stubQuery({ data: [{ id: ARGS.id }], error: null });
    await markAnnouncementsRead(query, ARGS.userId);

    assert.deepEqual(query.lastUpdate, { status: "read" });
    assert.deepEqual(query.filters, [
      ["user_id", ARGS.userId],
      ["type", "system_changelog"],
      ["status", "pending"],
    ]);
  });

  it("dismisses the caller's own row whether or not it was answered", async () => {
    // No status filter: clearing an unanswered invitation is allowed, and is
    // deliberately not the same thing as declining it.
    const query = stubQuery({ data: [{ id: ARGS.id }], error: null });
    await dismissNotification(query, ARGS);

    assert.deepEqual(query.lastUpdate, { status: "dismissed" });
    assert.deepEqual(query.filters, [
      ["id", ARGS.id],
      ["user_id", ARGS.userId],
    ]);
  });
});

describe("an update that matched nothing", () => {
  it("reports a decline that found no pending invitation", async () => {
    const { data, error } = await declineCampaignInvite(
      stubQuery({ data: [], error: null }),
      ARGS,
    );

    assert.equal(data, null);
    assert.equal(error.reason, "invite_not_found");
  });

  it("reports a dismissal that found no row", async () => {
    const { error } = await dismissNotification(
      stubQuery({ data: [], error: null }),
      ARGS,
    );

    assert.equal(error.reason, "not_found");
  });

  it("counts the announcements it read, so nothing to do is not an error", async () => {
    const { data, error } = await markAnnouncementsRead(
      stubQuery({ data: [], error: null }),
      ARGS.userId,
    );

    assert.deepEqual(data, { count: 0 });
    assert.equal(error, null);
  });
});
