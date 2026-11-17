import { MAX_COINS } from "sina/rules/currency";

import { controlClasses } from "@/app/components/ui/field-styles";
import { coinName, coinTint } from "@/app/dashboard/currency-presentation";

const number = new Intl.NumberFormat("en");

export default function CoinQuantityRow({
  id,
  coin,
  balance,
  typed,
  setTyped,
  bulk = false,
  stocking = false,
  footer,
  children,
}) {
  const name = coinName(coin);
  return (
    <div
      id={id}
      className="mt-2 rounded-lg border border-gold/25 bg-surface/95 px-2 py-1.5"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className="font-display text-xs"
          style={{ color: coinTint(coin) }}
        >
          {name}
        </span>
        <div className={bulk ? "w-28" : "w-16"}>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={String(MAX_COINS).length}
            value={typed}
            placeholder={bulk ? "Per member" : "Qty"}
            aria-label={`Amount of ${name}${bulk ? " per member" : ""}`}
            onChange={(event) => setTyped(event.target.value)}
            className={controlClasses({
              className: "px-1.5 py-1 text-center tabular-nums",
            })}
          />
        </div>
        <span className="text-xs text-ink/65 tabular-nums">
          {stocking
            ? `${number.format(balance)} in chest`
            : `of ${number.format(balance)}${bulk ? " total" : ""}`}
        </span>
        <div className="ml-auto flex flex-wrap items-center">{children}</div>
      </div>
      {footer}
    </div>
  );
}
