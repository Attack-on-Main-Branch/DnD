import { surfaceClasses } from "@/app/components/ui/surface";

/** Shared frame for each settings section, so the three read as one page. */
export default function SettingsCard({ title, description, children }) {
  return (
    <section
      className={surfaceClasses({
        glow: true,
        className: "rounded-2xl p-6 sm:p-8",
      })}
    >
      <h2 className="font-display text-lg font-semibold tracking-wide">
        {title}
      </h2>
      <p className="mt-1 font-sans text-sm text-ink/60">{description}</p>

      <div className="mt-6">{children}</div>
    </section>
  );
}
