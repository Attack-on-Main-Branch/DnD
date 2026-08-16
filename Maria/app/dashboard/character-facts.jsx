import { alignmentLabel, classLabel } from "sina/rules/character";

/**
 * The four facts under a character's name, as a Server Component.
 *
 * Lifted out of `character-card.jsx` because `alignmentLabel` and `classLabel`
 * are lookups over Sina's 400-line catalogue, and inside a Client Component all
 * of it ships to produce two short strings. The card still needs the browser
 * for its transition, clipboard and dialog; this does not.
 *
 * The Class row is omitted rather than dashed for characters made before
 * classes existed — an empty label is worse than one fewer fact.
 */
export default function CharacterFacts({ character }) {
  const characterClass = classLabel(character.class_id);

  return (
    <dl className="flex flex-col gap-1.5 font-sans text-sm">
      <Fact label="Race" value={character.race} />
      {characterClass && <Fact label="Class" value={characterClass} />}
      <Fact label="Alignment" value={alignmentLabel(character.alignment)} />
      <Fact label="Level" value={character.level} />
    </dl>
  );
}

function Fact({ label, value }) {
  return (
    <div className="flex min-w-0 gap-2">
      {/*
        /60 rather than /45, and with the same halo the value carries. At 45%
        the label composited to 3.8–4.3:1 depending on what the animation was
        doing behind the glass — under AA at both ends of that range, on 14px
        text. /60 holds 5.5:1 at the brightest and 6.9:1 at the darkest.
      */}
      <dt className="text-ink/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {label}
      </dt>
      <dd className="truncate font-medium text-ink drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {value}
      </dd>
    </div>
  );
}
