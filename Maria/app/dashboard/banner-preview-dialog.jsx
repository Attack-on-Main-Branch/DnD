"use client";

import Button from "@/app/components/ui/button";
import EditModal from "@/app/components/ui/edit-modal";
import { surfaceClasses } from "@/app/components/ui/surface";

import BannerSkinArt from "./banner-skin-art";
import { bannerSkinDetails } from "./banner-presentation";

export default function BannerPreviewDialog({
  open,
  skin,
  diceColor,
  onClose,
  onAfterClose,
}) {
  const { label } = bannerSkinDetails(skin);

  return (
    <EditModal
      open={open}
      title={`${label} banner preview`}
      size="banner"
      onClose={onClose}
      onAfterClose={onAfterClose}
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="font-display text-lg font-semibold tracking-wide text-gold">
          {label}
        </p>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <div
        className={surfaceClasses({
          variant: "plain",
          className:
            "relative isolate aspect-banner w-full overflow-hidden rounded-xl",
        })}
      >
        <BannerSkinArt
          skin={skin}
          diceColor={diceColor}
          animated={open}
          sizes="(max-width: 1200px) 100vw, 1200px"
        />
      </div>
    </EditModal>
  );
}
