/**
 * One settings section inside the page's single panel. A plain section rather
 * than a glass card of its own: three stacked surfaces read as three pages, and
 * one panel is what lets the whole thing open and close the way a sheet does.
 *
 * The rule is the creation sheet's, the one above its buttons. `first:` drops
 * it from the top of the stack, where there is nothing to divide.
 */
export default function SettingsSection({ title, description, children }) {
  return (
    <section className="border-t border-gold/15 pt-8 first:border-t-0 first:pt-0">
      <h2 className="font-display text-lg font-semibold tracking-wide">
        {title}
      </h2>
      <p className="mt-1 font-sans text-sm text-ink/60">{description}</p>

      <div className="mt-6">{children}</div>
    </section>
  );
}
