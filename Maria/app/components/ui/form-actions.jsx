import Button from "./button";

/**
 * The foot of a form that can also edit: its one button while writing, and
 * Cancel beside "Save edits" while editing. `onSave` is for a form that is not
 * a `<form>`; without it the button submits.
 */
export default function FormActions({
  editing = false,
  pending = false,
  disabled = false,
  label,
  pendingLabel,
  onCancel,
  onSave,
}) {
  const idle = editing ? "Save edits" : label;
  const busy = editing ? "Saving…" : pendingLabel;

  return (
    <div className="flex justify-end gap-3">
      {editing && (
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
      )}

      <Button
        type={onSave ? "button" : "submit"}
        onClick={onSave}
        disabled={disabled}
      >
        {pending ? busy : idle}
      </Button>
    </div>
  );
}
