/** An open hand, drawn in `currentColor`; `aria-hidden`, the control names it. */
export default function HandMark({ className = "size-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M11 11.5v-7a1.5 1.5 0 0 1 3 0v7" />
      <path d="M14 11.5V6.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M17 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1.2a6 6 0 0 1-4.9-2.5l-3.6-5a1.6 1.6 0 0 1 2.6-1.9L8 13.5" />
    </svg>
  );
}
