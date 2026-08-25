import {
  FADED_RULE_CLASSES,
  surfaceClasses,
} from "@/app/components/ui/surface";

import {
  categoryTagClasses,
  itemFactList,
  STACK_TAG_CLASSES,
  stackLabel,
} from "./inventory-presentation";

/**
 * The item somebody pressed, read out in full — a panel of its own under the
 * pack, drawn as the spell's is so the two marks open the same way.
 *
 * The order is the order a table asks: what is it and how many, what does it
 * do to them, then everything the rulebook says about it, then the prose. A
 * longsword prints five facts and a rope prints two — `itemFactList` gives back
 * only what the item has, so nothing answers a question nobody asked.
 *
 * No hooks: what is open is the drawer's business. The controls arrive as
 * children and sit under a rule at the foot.
 */
export default function ItemDetail({ item, quantity, children }) {
  const stack = stackLabel(quantity);
  const facts = itemFactList(item.facts);

  /* The dice come out of the grid and onto a line of their own, where the
     spell's damage is: it is the one fact a table reads mid-turn. */
  const damage = facts.find((fact) => fact.name === "damage");
  const versatile = facts.find((fact) => fact.name === "versatile");
  const rest = facts.filter(
    (fact) => fact.name !== "damage" && fact.name !== "versatile",
  );

  return (
    <section
      aria-label={item.name}
      className={surfaceClasses({
        variant: "solid",
        glow: true,
        // Bounded and scrolling inside itself, as the spell's is: this hangs
        // under a panel that is already 42vh tall. `glass-unfiltered` because a
        // filtered surface goes on filtering at `opacity: 0`.
        className:
          "scroll-gold max-h-[min(20rem,34vh)] overflow-y-auto rounded-2xl px-5 py-4 text-left glass-unfiltered",
      })}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 font-display text-sm font-semibold tracking-wide text-gold">
          {item.name}
        </h3>

        {stack && (
          <span className={`shrink-0 ${STACK_TAG_CLASSES}`}>{stack}</span>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className={categoryTagClasses(item.category)}>
          {item.category}
        </span>

        {item.facts?.kind && (
          <span className={categoryTagClasses(item.facts.kind)}>
            {item.facts.kind}
          </span>
        )}

        {item.facts?.rarity && (
          <span className={RARITY_CHIP_CLASSES}>{item.facts.rarity}</span>
        )}

        {item.facts?.attunement && (
          <span className={ATTUNEMENT_CHIP_CLASSES}>Attunement</span>
        )}
      </div>

      {(damage || versatile) && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {damage && (
            <span className="font-mono font-semibold text-orange-300 tabular-nums">
              {damage.value}
            </span>
          )}

          {damage && versatile && (
            <span aria-hidden="true" className="text-ink/25">
              ·
            </span>
          )}

          {versatile && (
            <span className="font-mono tracking-wide text-ink/65">
              Versatile {versatile.value}
            </span>
          )}
        </p>
      )}

      {rest.length > 0 && (
        <dl className="mt-3 grid grid-cols-3 gap-2">
          {rest.map((fact) => (
            <div key={fact.name} className="min-w-0">
              <dt className="font-mono text-[10px] tracking-[0.14em] text-ink/40 uppercase">
                {fact.label}
              </dt>
              <dd className="truncate text-xs text-ink/80" title={fact.value}>
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {item.description && (
        <p className="mt-3 text-xs leading-relaxed whitespace-pre-wrap text-ink/75">
          {item.description}
        </p>
      )}

      {children && (
        <>
          <div aria-hidden="true" className={`mt-4 ${FADED_RULE_CLASSES}`} />
          <div className="mt-3">{children}</div>
        </>
      )}
    </section>
  );
}

/**
 * The two badges that are a fact about the ITEM rather than about using it.
 * Rarity wears the arcane violet a magic item's category already does; the
 * attunement chip is amber, the colour concentration wears on a spell — both
 * are a thing being held that stops you holding another.
 */
const RARITY_CHIP_CLASSES =
  "inline-flex items-center rounded-full border border-arcane/35 bg-arcane/10 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-arcane/90 uppercase";

const ATTUNEMENT_CHIP_CLASSES =
  "inline-flex items-center rounded-full border border-amber-400/35 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-amber-200/90 uppercase";
