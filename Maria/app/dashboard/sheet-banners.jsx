"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { DEFAULT_BANNER_SKIN, validateBannerSkin } from "sina/rules/skins";

import { NESTED_CARD_SELECTED_CLASSES } from "@/app/components/ui/surface";
import { APPEARANCE_PICKER_HEIGHT_CLASSES } from "@/app/components/ui/field-styles";
import EyeIcon from "@/app/components/ui/eye-icon";
import Button from "@/app/components/ui/button";

import AppearanceControls from "./appearance-controls";
import { bannerSkinDetails } from "./banner-presentation";
import BannerPreview from "./banner-preview";
import BannerSkinPicker from "./banner-skin-picker";
import { useAppearanceDraft } from "./use-appearance-draft";

const loadPreview = () => import("./banner-preview-dialog");
const BannerPreviewDialog = dynamic(loadPreview, { ssr: false });

export default function SheetBanners({
  bannerSkin = DEFAULT_BANNER_SKIN,
  unlocked,
  allUnlocked,
  saveBanner,
  character,
  diceColor,
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const appearance = useAppearanceDraft(
    { skin: bannerSkin },
    ({ skin }) =>
      validateBannerSkin(skin)
        ? { kind: "rejected", message: "Choose a banner style." }
        : saveBanner(skin),
    "banner",
  );
  const chosen = bannerSkinDetails(appearance.draft.skin);

  return (
    <div className="flex flex-col gap-8">
      <aside
        aria-label="Banner preview"
        className={`grid items-center gap-4 rounded-2xl border p-4 md:grid-cols-2 md:gap-6 ${APPEARANCE_PICKER_HEIGHT_CLASSES} ${NESTED_CARD_SELECTED_CLASSES}`}
      >
        <div className="relative mx-auto w-full min-w-0 max-w-lg">
          <BannerPreview
            skin={chosen.value}
            character={character}
            diceColor={diceColor}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-display text-lg font-semibold text-gold">
                {chosen.label}
              </p>
              <p
                className={`font-mono text-[0.625rem] tracking-widest uppercase ${chosen.rarity.text}`}
              >
                {chosen.rarity.label}
              </p>
            </div>
            <p className="mt-1 text-xs text-ink/55">{chosen.description}</p>
          </div>
          <AppearanceControls
            subject="banner"
            align="start"
            showUndo={false}
            {...appearance}
          >
            <Button
              variant="secondary"
              aria-label={`Enlarge ${chosen.label} banner`}
              aria-haspopup="dialog"
              aria-expanded={previewOpen}
              data-tooltip="Enlarge banner preview"
              onPointerEnter={loadPreview}
              onFocus={loadPreview}
              onClick={() => {
                setPreviewReady(true);
                setPreviewOpen(true);
              }}
              className="size-11 shrink-0 p-0! text-gold"
            >
              <EyeIcon className="size-6 shrink-0" />
            </Button>
          </AppearanceControls>
        </div>
      </aside>
      <BannerSkinPicker
        diceColor={diceColor}
        value={appearance.draft.skin}
        unlocked={unlocked}
        allUnlocked={allUnlocked}
        disabled={appearance.saving}
        onChange={appearance.edit("skin")}
      />
      {previewReady && (
        <BannerPreviewDialog
          open={previewOpen}
          skin={chosen.value}
          diceColor={diceColor}
          onClose={() => setPreviewOpen(false)}
          onAfterClose={() => setPreviewReady(false)}
        />
      )}
    </div>
  );
}
