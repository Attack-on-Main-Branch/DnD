"use client";

import { ButtonContent } from "@/app/components/ui/button";
import Avatar from "@/app/components/ui/avatar";
import { CheckIcon } from "@/app/components/ui/select-menu";
import { diceColorHex } from "@/app/dashboard/character-presentation";
import styles from "./party-pills.module.css";

export default function PartyPills({
  members,
  chosen,
  onChoose,
  label,
  leading,
  checkmarks = false,
  showLabel = false,
}) {
  const columns =
    members.length === 4 ? 2 : Math.max(1, Math.min(3, members.length));

  const portraits = (
    <div className={styles.portraits} style={{ "--party-columns": columns }}>
      {members.map((member) => (
        <div key={member.id} className={styles.member}>
          <Pill
            active={
              Array.isArray(chosen)
                ? chosen.includes(member.id)
                : chosen === member.id
            }
            checkmark={checkmarks}
            onClick={() => onChoose(member.id)}
            label={member.name}
            face={
              <Avatar
                src={member.avatar_url}
                color={diceColorHex(member.dice_color)}
                size="xs"
                ring={false}
                className="-my-px -ml-px"
              />
            }
          >
            <span className="button-label min-w-0 flex-1 truncate text-left">
              {member.name}
            </span>
          </Pill>
        </div>
      ))}
    </div>
  );

  return (
    <div role="group" aria-label={label} className="space-y-2">
      {showLabel && <p className="text-sm text-ink/75">{label}</p>}
      {leading ? (
        <div className={styles.withLeading}>
          <div className={styles.leading}>{leading}</div>
          {portraits}
        </div>
      ) : (
        portraits
      )}
    </div>
  );
}

/**
 * The avatar overlaps the border so it sits flush against the capsule's edge.
 */
export function Pill({
  active,
  onClick,
  disabled,
  label,
  face,
  checkmark,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border font-display text-xs tracking-wide transition duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
        face
          ? "w-full min-w-0 justify-start py-0 pr-2 pl-0"
          : "justify-center px-3 py-1.5"
      } ${
        active
          ? "border-gold/55 bg-gold/15 text-gold"
          : "border-gold/20 bg-surface/40 text-ink/70 hover:border-gold/45 hover:text-gold"
      }`}
    >
      {face}
      <ButtonContent>{children}</ButtonContent>
      {checkmark && (
        <span
          aria-hidden="true"
          className="grid size-4 shrink-0 place-items-center"
        >
          {active ? (
            <CheckIcon />
          ) : (
            <span className="size-2 rounded-full border border-ink/45" />
          )}
        </span>
      )}
    </button>
  );
}
