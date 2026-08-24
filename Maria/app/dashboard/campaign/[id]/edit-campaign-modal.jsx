"use client";

import { useState } from "react";

import EditModal from "@/app/components/ui/edit-modal";
import CampaignForm from "@/app/dashboard/campaign-form";

/**
 * The campaign sheet, opened over itself — the counterpart to the character's
 * and built the same way, out of the creation sheet's own form.
 *
 * Its own module because it is loaded on demand: the map field brings the
 * browser-side image compression with it. See edit-campaign-pencil.jsx.
 */
export default function EditCampaignModal({ campaign, open, onClose }) {
  const [busy, setBusy] = useState(false);

  return (
    <EditModal
      open={open}
      title={`Edit ${campaign.title}`}
      busy={busy}
      onClose={onClose}
    >
      <CampaignForm
        campaign={campaign}
        onPending={setBusy}
        onDone={onClose}
        onCancel={onClose}
      />
    </EditModal>
  );
}
