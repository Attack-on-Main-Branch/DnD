"use client";

import TokensMark from "@/app/components/ui/tokens-mark";

import DmTray from "./dm-tray";
import TokenPalette from "./token-palette";

/**
 * The hand of pieces, last in the head of the table's box. It stays open while
 * pieces are dealt — nothing but its own mark closes it — so the board can be
 * worked from it: pick a face, click a hex, pick the next.
 */
export default function TokenStage({ members }) {
  return (
    <DmTray
      mark={<TokensMark className="size-11" />}
      markLabel="Tokens to place on the board"
      title="Tokens"
      panelLabel="Place a piece"
    >
      <TokenPalette members={members} />
    </DmTray>
  );
}
