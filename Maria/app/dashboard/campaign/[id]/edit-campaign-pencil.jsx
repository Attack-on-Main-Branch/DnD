"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import PencilButton from "@/app/components/ui/pencil-button";

/** Fetched when it is wanted: the sheet carries the map field, and with it the
    browser-side image compression. See the character sheet's copy. */
const EditCampaignModal = dynamic(() => import("./edit-campaign-modal"), {
  ssr: false,
});

/** The pen in the corner of the campaign sheet, and the sheet it opens. See
    the character sheet's copy for why every press mounts a fresh one. */
export default function EditCampaignPencil({ campaign }) {
  const [opens, setOpens] = useState(0);
  const [open, setOpen] = useState(false);

  const prepare = useCallback(() => {
    import("./edit-campaign-modal");
  }, []);

  return (
    <>
      <PencilButton
        label={`Edit ${campaign.title}`}
        onPrepare={prepare}
        onClick={() => {
          setOpens((count) => count + 1);
          setOpen(true);
        }}
      />

      {opens > 0 && (
        <EditCampaignModal
          key={opens}
          campaign={campaign}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
