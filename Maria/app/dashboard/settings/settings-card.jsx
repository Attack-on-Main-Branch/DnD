/** Shared frame for each settings section, so the three read as one page. */
export default function SettingsCard({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-white/5">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {description}
      </p>

      <div className="mt-6">{children}</div>
    </section>
  );
}
