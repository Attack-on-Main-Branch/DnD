export default function CloseButton({ ref, label, onClick }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-ink/65 hover:text-gold focus-visible:outline-2 focus-visible:outline-gold max-sm:size-11"
    >
      <span aria-hidden="true">✕</span>
    </button>
  );
}
