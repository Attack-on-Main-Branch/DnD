"use client";

import { useState, useTransition } from "react";
import { MAX_TOKEN_HP, validTokenHealthDelta } from "sina/rules/token-health";
import { healthFraction, healthTier } from "sina/rules/health";
import { adjustTokenHealth } from "@/app/actions/table-adjustments";
import { controlClasses } from "@/app/components/ui/field-styles";
import HealthBar from "@/app/components/ui/health-bar";
import { StepButton } from "@/app/components/ui/quantity-stepper";
import FormAlert from "@/app/components/ui/form-alert";
import { healthBarClass } from "@/app/dashboard/health-presentation";

export default function TokenHealth({ token, onChange }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();
  const hp = token.health;
  const step = Number(amount);
  const typed = validTokenHealthDelta(step) && step > 0;

  function apply(delta) {
    setError(null);
    startTransition(async () => {
      const result = await adjustTokenHealth(token.id, delta).catch(() => null);
      if (result?.kind !== "success") {
        setError(
          result?.message ?? "Could not change those hit points. Try again.",
        );
        return;
      }
      await onChange();
    });
  }

  return (
    <div className="px-2 py-2">
      <HealthBar
        compact
        current={hp.current_hp}
        max={hp.max_hp}
        fraction={healthFraction(hp.current_hp, hp.max_hp)}
        tierClass={healthBarClass(healthTier(hp.current_hp, hp.max_hp))}
        label={`${token.label} health`}
      />
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
        <div className="w-14 shrink-0">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_TOKEN_HP}
            step={1}
            value={amount}
            disabled={pending}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="HP"
            aria-label={`Hit points to take from or give to ${token.label}`}
            className={controlClasses({
              className: "no-spin px-1 py-1 text-center tabular-nums",
            })}
          />
        </div>
        <StepButton
          wide
          tone="danger"
          label={`Take hit points from ${token.label}`}
          disabled={pending || !typed || hp.current_hp === 0}
          onClick={() => apply(-step)}
        >
          Damage
        </StepButton>
        <StepButton
          wide
          label={`Give hit points to ${token.label}`}
          disabled={pending || !typed || hp.current_hp === hp.max_hp}
          onClick={() => apply(step)}
        >
          Heal
        </StepButton>
      </div>
      <FormAlert>{error}</FormAlert>
    </div>
  );
}
