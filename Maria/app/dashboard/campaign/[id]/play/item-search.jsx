"use client";

import ItemRow from "@/app/dashboard/item-row";

import CatalogueSearch from "./catalogue-search";

export default function ItemSearch(props) {
  return (
    <CatalogueSearch
      {...props}
      kind="items"
      label="an item"
      placeholder="Search your items and the SRD — potion, longsword…"
      unavailable="The item catalogue could not be reached. Homebrew still works."
      renderRow={(item, rowProps) => <ItemRow item={item} {...rowProps} />}
    />
  );
}
