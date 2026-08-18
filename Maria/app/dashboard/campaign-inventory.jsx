import Link from "next/link";
import { MAX_CAMPAIGNS } from "sina/rules/campaign";

import { surfaceClasses } from "@/app/components/ui/surface";

import CampaignCard from "./campaign-card";

/**
 * The campaigns a Dungeon Master is running, laid out exactly as the roster is.
 * A section of its own rather than more cells in that grid, because the two
 * caps are separate triggers — one shared grid would have to answer "3 of 3"
 * with two different meanings. A Server Component; the cards are the client half.
 */
export default function CampaignInventory({ campaigns }) {
  const emptySlots = Math.max(0, MAX_CAMPAIGNS - campaigns.length);

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <h2 className="font-display text-xl font-semibold tracking-wide text-ink">
          Campaigns
        </h2>

        <p className="font-sans text-xs tracking-wide text-ink/50 uppercase">
          {campaigns.length} of {MAX_CAMPAIGNS} slots used
        </p>
      </div>

      {/* The roster's grid, so a campaign tile lands on the same column edges
          as the character tile above it. */}
      <ul className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            <CampaignCard campaign={campaign} />
          </li>
        ))}

        {Array.from({ length: emptySlots }, (_, index) => (
          <li key={`empty-${index}`}>
            <EmptySlot />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * `?new=dm` rather than `?new`, so this lands on the campaign form instead of
 * the role question — already answered by clicking an empty campaign slot.
 */
function EmptySlot() {
  return (
    <Link
      href="/dashboard?new=dm"
      className={surfaceClasses({
        glow: true,
        className:
          "group flex aspect-video min-h-58 w-full flex-col items-center justify-center gap-3 rounded-2xl border-dashed text-ink/50 hover:text-gold",
      })}
    >
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-full border border-gold/30 text-2xl leading-none font-light text-gold/70 transition duration-300 group-hover:border-gold/70 group-hover:text-gold group-hover:shadow-[0_0_24px_-4px_rgba(255,223,156,0.6)]"
      >
        +
      </span>
      <span className="font-display text-sm tracking-wide">New campaign</span>
    </Link>
  );
}
