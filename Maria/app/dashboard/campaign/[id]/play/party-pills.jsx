"use client";

import Avatar from "@/app/components/ui/avatar";
import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";

/**
 * The row of faces above a panel that can only hold one at a time — the pack's,
 * and the sheet's beside it.
 *
 * `role="group"` rather than a tablist: these control no panel of their own,
 * they aim the one below. `children` come first, which is where the pack puts
 * "All party" — a pill that is a target rather than a view has no business in
 * the list, hence a slot instead of a flag.
 */
export default function PartyPills({
  members,
  chosen,
  onChoose,
  label,
  children,
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {children}

      {members.map((member) => (
        <Pill
          key={member.id}
          active={chosen === member.id}
          onClick={() => onChoose(member.id)}
          // Named outright: the avatar is `aria-hidden`, so the only text is
          // inside a span.
          label={member.name}
        >
          <Avatar
            initials={characterInitials(member.name)}
            colorClass={avatarColorClass(member.color_theme)}
            size="xs"
          />
          <span className="max-w-32 truncate">{member.name}</span>
        </Pill>
      ))}
    </div>
  );
}

export function Pill({ active, onClick, disabled, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 font-display text-xs tracking-wide transition duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-gold/55 bg-gold/15 text-gold"
          : "border-gold/20 bg-surface/40 text-ink/70 hover:border-gold/45 hover:text-gold"
      }`}
    >
      {children}
    </button>
  );
}
