"use client";

import SpellRow from "@/app/dashboard/spell-row";

import CatalogueSearch from "./catalogue-search";

export default function SpellSearch(props) {
  return (
    <CatalogueSearch
      {...props}
      kind="spells"
      label="a spell"
      placeholder="Search the SRD — fireball, cure wounds…"
      unavailable="The spell catalogue could not be reached."
      renderRow={(spell, rowProps) => <SpellRow spell={spell} {...rowProps} />}
    />
  );
}
