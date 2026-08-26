/**
 * A word about the control under the pointer, and NOT the browser's own `title`:
 * that one is drawn in the OS palette after a delay nobody can set.
 *
 * NEEDS `group/note relative` ON THE CONTROL, because these sit inside cards and
 * panels that are already groups of their own.
 *
 * `aria-hidden`: the control says the same thing in its own label.
 */
export default function HoverNote({ children, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute z-20 rounded-md border border-gold/25 bg-surface/95 px-2 py-1 font-sans text-[0.7rem] whitespace-nowrap text-gold opacity-0 transition-opacity duration-200 group-hover/note:opacity-100 group-focus-visible/note:opacity-100 ${className}`}
    >
      {children}
    </span>
  );
}
