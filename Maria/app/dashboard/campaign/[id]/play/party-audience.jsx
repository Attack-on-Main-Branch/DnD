"use client";

import PartyPills, { Pill } from "@/app/dashboard/party-pills";

export default function PartyAudience({
  members,
  value,
  onChange,
  label,
  single = false,
}) {
  const all =
    members.length > 0 && members.every((member) => value.includes(member.id));

  function toggle(id) {
    if (value.includes(id)) {
      onChange(value.filter((chosen) => chosen !== id));
    } else {
      onChange(single ? [id] : [...value, id]);
    }
  }

  return (
    <PartyPills
      members={members}
      chosen={value}
      onChoose={toggle}
      label={label}
      checkmarks
      showLabel
      leading={
        !single && (
          <Pill
            active={all}
            checkmark
            disabled={!members.length}
            onClick={() => onChange(all ? [] : members.map(({ id }) => id))}
          >
            All party
          </Pill>
        )
      }
    />
  );
}
