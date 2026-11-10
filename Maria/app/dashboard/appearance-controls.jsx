import Button from "@/app/components/ui/button";

export default function AppearanceControls({
  subject,
  save,
  undo,
  saving,
  changed,
  note,
  align = "center",
  showUndo = true,
  children,
}) {
  return (
    <div>
      <div
        className={`flex flex-wrap gap-2 ${align === "start" ? "justify-start" : "justify-center"}`}
      >
        <Button onClick={save} disabled={!changed || saving}>
          {saving ? "Saving…" : `Save ${subject}`}
        </Button>
        {children}
        {showUndo && changed && !saving && (
          <Button variant="ghost" onClick={undo}>
            Undo
          </Button>
        )}
      </div>
      <p
        role="status"
        className={`mt-3 min-h-4 text-xs text-gold/75 ${align === "start" ? "text-left" : "text-center"}`}
      >
        {note}
      </p>
    </div>
  );
}
