"use client";

import { cloneElement, useState } from "react";

import EditModal from "@/app/components/ui/edit-modal";

export default function DetailOverlay({ children, title, onClose }) {
  const [shown, setShown] = useState(null);
  const [dismissing, setDismissing] = useState(false);

  if (children && (shown?.children !== children || shown.title !== title)) {
    setShown({ children, title });
  }

  if (!shown) return null;

  function finish() {
    setShown(null);
    setDismissing(false);
    if (children) onClose();
  }

  const dismiss = () => setDismissing(true);

  return (
    <EditModal
      size="detail"
      open={Boolean(children) && !dismissing}
      title={shown.title}
      onClose={dismiss}
      onAfterClose={finish}
    >
      {cloneElement(shown.children, { onClose: dismiss })}
    </EditModal>
  );
}
