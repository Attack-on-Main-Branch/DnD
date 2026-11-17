export default function EmptyCatalogue({ title, description }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gold/20 py-10 text-center">
      <p className="font-display text-base font-medium tracking-wide text-ink/80">
        {title}
      </p>
      <p className="max-w-sm px-4 text-xs text-ink/50">{description}</p>
    </div>
  );
}

export function EmptyPack({ description }) {
  return <EmptyCatalogue title="The pack is empty" description={description} />;
}

export function EmptySpellbook({ description }) {
  return (
    <EmptyCatalogue title="No spells are known" description={description} />
  );
}
