import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compareVersions,
  countUnread,
  inviteDetails,
  isAnswerable,
  isUnread,
  shouldAnnounce,
} from "./notifications.js";

describe("compareVersions", () => {
  it("orders by number rather than by string", () => {
    // The regression this exists for: "0.10.0" < "0.9.0" lexicographically, so
    // a string comparison would stop announcing releases at the tenth minor.
    assert.equal(compareVersions("0.10.0", "0.9.0"), 1);
    assert.equal(compareVersions("0.9.0", "0.10.0"), -1);
  });

  it("compares each part in turn", () => {
    assert.equal(compareVersions("1.0.0", "0.99.99"), 1);
    assert.equal(compareVersions("0.8.2", "0.8.10"), -1);
    assert.equal(compareVersions("0.8.1", "0.8.1"), 0);
  });

  it("treats an unreadable version as older than any real one", () => {
    assert.equal(compareVersions(null, "0.1.0"), -1);
    assert.equal(compareVersions("0.1.0", "not-a-version"), 1);
    assert.equal(compareVersions(undefined, null), 0);
  });
});

describe("shouldAnnounce", () => {
  it("announces a release nobody has been told about", () => {
    assert.equal(shouldAnnounce("0.9.0", null), true);
  });

  it("stays quiet once the current release has been announced", () => {
    assert.equal(shouldAnnounce("0.9.0", "0.9.0"), false);
  });

  it("stays quiet after a rollback, rather than announcing backwards", () => {
    assert.equal(shouldAnnounce("0.8.1", "0.9.0"), false);
  });

  it("refuses to announce a version the database would reject", () => {
    // `announce_version` raises `invalid_version` on anything but three
    // numbers, so asking would cost a round trip to be told no.
    assert.equal(shouldAnnounce("0.9.0-beta", null), false);
    assert.equal(shouldAnnounce("", null), false);
  });
});

describe("what counts as unread", () => {
  const pendingInvite = { type: "campaign_invite", status: "pending" };
  const answered = { type: "campaign_invite", status: "accepted" };
  const announcement = { type: "system_changelog", status: "pending" };

  it("is `pending`, for both types", () => {
    assert.equal(isUnread(pendingInvite), true);
    assert.equal(isUnread(announcement), true);
    assert.equal(isUnread(answered), false);
  });

  it("counts what the pip shows", () => {
    assert.equal(countUnread([pendingInvite, answered, announcement]), 2);
    assert.equal(countUnread([]), 0);
    assert.equal(countUnread(undefined), 0);
  });

  it("offers buttons only on an invitation still waiting", () => {
    assert.equal(isAnswerable(pendingInvite), true);
    assert.equal(isAnswerable(answered), false);
    assert.equal(isAnswerable(announcement), false);
  });
});

describe("inviteDetails", () => {
  it("reads the handle out of the row's data", () => {
    const details = inviteDetails({
      data: {
        campaign_id: "c-1",
        campaign_title: "The Sunken Crown",
        character_id: "ch-1",
        character_name: "Frieren",
        character_discriminator: "1000",
      },
    });

    assert.deepEqual(details, {
      campaignId: "c-1",
      campaignTitle: "The Sunken Crown",
      characterId: "ch-1",
      characterName: "Frieren",
      characterDiscriminator: "1000",
    });
  });

  it("is null without both ids, which is what the card is drawn from", () => {
    assert.equal(inviteDetails({ data: { campaign_id: "c-1" } }), null);
    assert.equal(inviteDetails({ data: {} }), null);
    assert.equal(inviteDetails({}), null);
  });
});
