"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MAX_CAMPAIGN_CONTAINERS, readContainers } from "sina/rules/containers";
import { MAX_CAMPAIGN_ITEMS } from "sina/rules/inventory";
import { MAX_CHARACTER_FEATURES } from "sina/rules/features";
import { MAX_CAMPAIGN_SPELLS } from "sina/rules/spells";

import { NESTED_CARD_CLASSES } from "@/app/components/ui/surface";
import {
  chestAudienceLine,
  containerTagClasses,
  containerTypeLabel,
  CONTAINER_CARD_CLASSES,
  NOBODY_YET,
} from "@/app/dashboard/container-presentation";
import {
  catalogueFacts,
  itemFactList,
  rowItem,
} from "@/app/dashboard/inventory-presentation";
import { removeCharacterFeature } from "@/app/actions/features";
import FeatureGrid from "@/app/dashboard/feature-grid";
import PackItemCard, { EmptyPack } from "@/app/dashboard/pack-item-card";
import {
  LEVEL_TAG_CLASSES,
  SCHOOL_TAG_CLASSES,
  levelBadge,
} from "@/app/dashboard/spell-presentation";

import ContainerForm from "./container-form";
import CampaignFeatureForm from "./feature-form";
import { strikeCampaignContainer } from "./container-actions";
import ItemForm from "./item-form";
import { strikeCampaignItem } from "./item-actions";
import SpellForm from "./spell-form";
import { strikeCampaignSpell } from "./spell-actions";

/**
 * Where homebrew is invented, all three kinds of it. Written here rather than
 * at the table, where a form inside a popover had nowhere to keep what it made
 * between sessions; the table's own searches and drawers find these.
 *
 * WHAT is being made comes first: the three forms have almost nothing in common
 * past a name, and one carrying all of them would be a form where most of the
 * boxes are always wrong.
 *
 * An item and a spell are DESCRIPTIONS; a container exists at once. It is
 * written here anyway, because a chest made mid-session is a chest made in
 * front of the people it is meant to surprise.
 */

const KINDS = [
  { value: "item", label: "Item" },
  { value: "spell", label: "Spell" },
  { value: "container", label: "Container" },
  { value: "feature", label: "Feature" },
];

/** What the counter over each form says, and what the list under it is called. */
const WRITTEN = {
  item: (counts) => `${counts.item} of ${MAX_CAMPAIGN_ITEMS} written`,
  spell: (counts) => `${counts.spell} of ${MAX_CAMPAIGN_SPELLS} written`,
  container: (counts) =>
    `${counts.container} of ${MAX_CAMPAIGN_CONTAINERS} on the table`,
  /* Per CHARACTER rather than per campaign, which is where the limit is: a
     party of six may hold six times this between them. */
  feature: (counts) =>
    `${counts.feature} granted · ${MAX_CHARACTER_FEATURES} a character`,
};

const LIST_TITLES = {
  item: "Your items",
  spell: "Your spells",
  container: "Your containers",
  feature: "Your features",
};

export default function CreatePanel({
  campaignId,
  members,
  items,
  spells,
  containers,
  containerItems,
  features,
}) {
  const [kind, setKind] = useState("item");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  /* THE FEATURES ARE HELD HERE and the other three lists are not, and the
     difference is where the write lands: an item, a spell and a container are
     the campaign's own rows and their actions revalidate this route, while a
     feature belongs to a CHARACTER and asking a campaign to render again for
     one would be the wrong page refetching itself. */
  const [granted, setGranted] = useState(features);
  const [striking, setStriking] = useState(() => new Set());

  const adopted = useRef(features);

  useEffect(() => {
    if (adopted.current === features) {
      return;
    }

    adopted.current = features;
    setGranted(features);
  }, [features]);

  /** Whose it is, for the line under each card. */
  const namesById = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members],
  );

  /* Read once rather than per card: two shapes live in one table. */
  const shelf = useMemo(() => readContainers(containers), [containers]);

  /* How much is in each of the ones NOBODY is carrying. A carried bag keeps
     its contents in pack rows, which are read at the table and not here. */
  const inside = useMemo(() => {
    const counted = new Map();

    for (const row of containerItems ?? []) {
      counted.set(row.container_id, (counted.get(row.container_id) ?? 0) + 1);
    }

    return counted;
  }, [containerItems]);

  const counts = {
    item: items.length,
    spell: spells.length,
    container: shelf.length,
    feature: granted.length,
  };

  function written(feature, refusal) {
    setError(refusal);

    if (feature) {
      setGranted((standing) => [...standing, feature]);
    }
  }

  async function strikeFeature(feature) {
    setError(null);
    setStriking((standing) => new Set(standing).add(feature.id));

    const before = granted;

    setGranted((standing) => standing.filter((one) => one.id !== feature.id));

    const result = await removeCharacterFeature(
      feature.id,
      feature.character_id,
    ).catch(() => null);

    setStriking((standing) => {
      const next = new Set(standing);
      next.delete(feature.id);
      return next;
    });

    if (!result || result.kind === "rejected") {
      setGranted(before);
      setError(result?.message ?? "That did not reach the table. Try again.");
    }
  }

  function strike(remove, id) {
    startTransition(async () => {
      const result = await remove(campaignId, id);

      setError(result?.kind === "rejected" ? result.message : null);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1">
          <h2 className="font-display text-sm font-semibold tracking-wide text-ink/85">
            Write something down
          </h2>

          <p className="font-sans text-xs tracking-wide text-ink/50 uppercase">
            {WRITTEN[kind](counts)}
          </p>
        </div>

        <p className="mt-2 text-xs text-ink/50">
          Anything the rulebook has never heard of. What you write here is found
          at the table beside the SRD’s own — handed out from the pack, taught
          from the spellbook, or opened from the chest.
        </p>

        {/* A group of three rather than a tab strip: these select a FORM. */}
        <div
          role="group"
          aria-label="What to create"
          className="mt-4 flex flex-wrap gap-2"
        >
          {KINDS.map((one) => (
            <button
              key={one.value}
              type="button"
              onClick={() => setKind(one.value)}
              aria-pressed={kind === one.value}
              className={`cursor-pointer rounded-full border px-4 py-1.5 font-display text-xs tracking-wide transition duration-300 ${
                kind === one.value
                  ? "border-gold/55 bg-gold/15 text-gold"
                  : "border-gold/20 bg-surface/40 text-ink/70 hover:border-gold/45 hover:text-gold"
              }`}
            >
              {one.label}
            </button>
          ))}
        </div>

        {/* Keyed, so switching kinds is a fresh form. */}
        {kind === "spell" && (
          <SpellForm
            key="spell"
            campaignId={campaignId}
            written={counts.spell}
          />
        )}

        {kind === "item" && (
          <ItemForm key="item" campaignId={campaignId} written={counts.item} />
        )}

        {kind === "container" && (
          <ContainerForm
            key="container"
            campaignId={campaignId}
            written={counts.container}
          />
        )}

        {kind === "feature" && (
          <CampaignFeatureForm
            key="feature"
            members={members}
            onWritten={written}
          />
        )}
      </section>

      <section>
        <h2 className="font-display text-sm font-semibold tracking-wide text-ink/85">
          {LIST_TITLES[kind]}
        </h2>

        {kind === "spell" &&
          (spells.length === 0 ? (
            <div className="mt-3">
              <EmptyPack
                title="Nothing written down"
                description="Spells you invent for this campaign are kept here, and taught from the table."
              />
            </div>
          ) : (
            <ul className="mt-3 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {spells.map((row) => (
                <li key={row.id} className="flex">
                  <SpellEntry
                    spell={row}
                    disabled={isPending}
                    onStrike={() => strike(strikeCampaignSpell, row.id)}
                  />
                </li>
              ))}
            </ul>
          ))}

        {kind === "item" &&
          (items.length === 0 ? (
            <div className="mt-3">
              <EmptyPack
                title="Nothing written down"
                description="Items you invent for this campaign are kept here, and found from the table."
              />
            </div>
          ) : (
            // Three to a row, as on the character sheet: same width, same cards.
            <ul className="mt-3 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((row, index) => (
                <li key={row.id} className="flex">
                  <PackItemCard item={rowItem(row)} index={index}>
                    {/* What the panel at the table will print, on one line. */}
                    <ItemFacts row={row} />

                    <div className="mt-2 flex justify-end">
                      <StrikeButton
                        label={`Remove ${row.name}`}
                        disabled={isPending}
                        onClick={() => strike(strikeCampaignItem, row.id)}
                      />
                    </div>
                  </PackItemCard>
                </li>
              ))}
            </ul>
          ))}

        {kind === "container" &&
          (shelf.length === 0 ? (
            <div className="mt-3">
              <EmptyPack
                title="Nothing on the table"
                description="Bags and chests you make are opened from the table — a bag by whoever carries it, a chest once you reveal it."
              />
            </div>
          ) : (
            <ul className="mt-3 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shelf.map((container) => (
                <li key={container.id} className="flex">
                  <ContainerEntry
                    container={container}
                    members={members}
                    inside={inside.get(container.id) ?? 0}
                    disabled={isPending}
                    onStrike={() =>
                      strike(strikeCampaignContainer, container.id)
                    }
                  />
                </li>
              ))}
            </ul>
          ))}

        {kind === "feature" &&
          (granted.length === 0 ? (
            <div className="mt-3">
              <EmptyPack
                title="Nothing granted"
                description="Features you write onto this party are read from their sheets and from the scores drawer at the table."
              />
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-4">
              {members
                .filter((member) =>
                  granted.some((one) => one.character_id === member.id),
                )
                .map((member) => (
                  <section key={member.id}>
                    <h3 className="font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
                      {namesById.get(member.id)}
                    </h3>

                    <div className="mt-2">
                      <FeatureGrid
                        features={granted.filter(
                          (one) => one.character_id === member.id,
                        )}
                        onRemove={strikeFeature}
                        pending={striking}
                      />
                    </div>
                  </section>
                ))}
            </div>
          ))}

        {error && (
          <p role="alert" className="mt-3 text-xs text-red-300">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

/**
 * Built to PackItemCard's shape so the two lists read as one thing: the level
 * where a stack count goes, the school where a category tag goes.
 */
function SpellEntry({ spell, disabled, onStrike }) {
  return (
    <div
      className={`flex h-full w-full flex-col rounded-xl border p-3.5 text-left transition duration-300 ${NESTED_CARD_CLASSES}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 font-display text-sm font-semibold tracking-wide text-ink">
          {spell.name}
        </p>

        <span className={`shrink-0 ${LEVEL_TAG_CLASSES}`}>
          {levelBadge(spell.level)}
        </span>
      </div>

      {spell.school && (
        <p className="mt-1.5">
          <span className={SCHOOL_TAG_CLASSES}>{spell.school}</span>
        </p>
      )}

      {spell.description && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink/55">
          {spell.description}
        </p>
      )}

      <div className="mt-auto flex justify-end pt-3">
        <StrikeButton
          label={`Remove ${spell.name}`}
          disabled={disabled}
          onClick={onStrike}
        />
      </div>
    </div>
  );
}

/**
 * The same card again, saying whose it is. What is INSIDE a carried bag is not
 * counted here: those rows are that character's pack's, read at the table.
 */
function ContainerEntry({ container, members, inside, disabled, onStrike }) {
  const carrier = members.find(
    (member) => member.id === container.ownerCharacterId,
  );

  return (
    <div className={`flex h-full w-full flex-col ${CONTAINER_CARD_CLASSES}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 font-display text-sm font-semibold tracking-wide text-ink">
          {container.name}
        </p>

        <span className={`shrink-0 ${containerTagClasses(container.type)}`}>
          {containerTypeLabel(container.type)}
        </span>
      </div>

      <p className="mt-2 text-xs text-ink/55">
        {container.type === "chest"
          ? chestAudienceLine(container, members)
          : carrier
            ? `Carried by ${carrier.name}`
            : NOBODY_YET}
      </p>

      {/* Only for the ones nobody is carrying — see above. */}
      {(container.type === "chest" || !carrier) && (
        <p className="mt-1 font-mono text-[10px] tracking-[0.16em] text-ink/40 uppercase">
          {inside} inside
        </p>
      )}

      <div className="mt-auto flex justify-end pt-3">
        <StrikeButton
          label={`Remove ${container.name}`}
          disabled={disabled}
          onClick={onStrike}
        />
      </div>
    </div>
  );
}

/** The written-down facts, run together — the card has one line for them. */
function ItemFacts({ row }) {
  const facts = itemFactList(catalogueFacts(row));

  if (facts.length === 0) {
    return null;
  }

  return (
    <p className="font-mono text-[11px] text-ink/45 tabular-nums">
      {facts.map((fact) => fact.value).join(" · ")}
    </p>
  );
}

/** The dashboard's Retire and Delete: ink at rest, red under the pointer. */
function StrikeButton({ label, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="cursor-pointer rounded-md px-2 py-1 font-display text-xs tracking-wide text-ink/60 transition-colors duration-300 hover:text-red-500 disabled:cursor-not-allowed disabled:text-ink/25"
    >
      Remove
    </button>
  );
}
