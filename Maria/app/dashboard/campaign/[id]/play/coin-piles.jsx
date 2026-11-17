"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { COIN_TYPES } from "sina/rules/currency";

import { coinName, coinTint } from "@/app/dashboard/currency-presentation";

import { mountCoinPile, PILE_HEIGHT, PILE_WIDTH } from "./coin-pile-art";
import styles from "./coin-piles.module.css";

const number = new Intl.NumberFormat("en");
const pigments = {
  cp: "color-mix(in srgb, var(--color-copper) 75%, peru)",
  gp: "color-mix(in srgb, var(--color-gold) 36%, orange)",
  pp: "color-mix(in srgb, var(--color-platinum) 62%, mediumpurple)",
};

function CoinPile({
  coin,
  amount,
  showEmpty,
  open,
  highlighted,
  controls,
  onToggle,
  onHover,
  onFocus,
}) {
  const slot = useRef(null);
  const art = useRef(null);
  const shadows = useRef(null);
  const flight = useRef(null);
  const renderer = useRef(null);
  const [present, setPresent] = useState(amount > 0);
  const label = coinName(coin);
  const balance = number.format(amount);

  useLayoutEffect(() => {
    const instance = mountCoinPile(
      slot.current,
      art.current,
      shadows.current,
      flight.current,
      setPresent,
    );
    renderer.current = instance;
    return () => instance.dispose();
  }, []);

  useLayoutEffect(() => {
    renderer.current?.setAmount(amount, showEmpty);
  }, [amount, showEmpty]);

  return (
    <li
      ref={slot}
      hidden={!showEmpty && !amount && !present}
      className={styles.slot}
      data-highlight={highlighted ? "" : undefined}
      style={{ "--metal": coinTint(coin), "--coin-pigment": pigments[coin] }}
    >
      <canvas ref={shadows} className={styles.shadow} aria-hidden="true" />
      <canvas ref={art} className={styles.art} aria-hidden="true" />
      <canvas ref={flight} className={styles.flight} aria-hidden="true" />
      <button
        type="button"
        className={styles.trigger}
        aria-label={`${label}: ${balance} coins`}
        aria-controls={open ? controls : undefined}
        aria-expanded={controls ? open : undefined}
        aria-pressed={controls ? undefined : open}
        onClick={onToggle}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") onHover(coin);
        }}
        onPointerLeave={() => onHover(null)}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) onFocus(coin);
        }}
        onBlur={() => onFocus(null)}
      >
        <span
          aria-hidden="true"
          className={`${styles.capsule} font-display text-xs`}
        >
          {label} <strong className="font-mono tabular-nums">{balance}</strong>
        </span>
      </button>
    </li>
  );
}

export default function CoinPiles({
  purse,
  showEmpty,
  open,
  controls,
  onSelect,
  emptyLabel = "Your purse is empty.",
}) {
  const [hovered, setHovered] = useState(null);
  const [focused, setFocused] = useState(null);
  const highlighted = [hovered, focused, open].find(
    (coin) => coin && (showEmpty || purse?.[coin] > 0),
  );

  return (
    <>
      <ul
        aria-label="Coin piles"
        className={styles.row}
        style={{
          "--pile-width": PILE_WIDTH,
          "--pile-height": PILE_HEIGHT,
        }}
      >
        {COIN_TYPES.map((coin) => (
          <CoinPile
            key={coin}
            coin={coin}
            amount={purse?.[coin] ?? 0}
            showEmpty={showEmpty}
            open={open === coin}
            highlighted={highlighted === coin}
            controls={controls}
            onHover={setHovered}
            onFocus={setFocused}
            onToggle={() => {
              if (open === coin) {
                setHovered(null);
                setFocused(null);
              }
              onSelect(open === coin ? null : coin);
            }}
          />
        ))}
      </ul>
      {emptyLabel &&
        !showEmpty &&
        !COIN_TYPES.some((coin) => purse?.[coin] > 0) && (
          <p className="py-1 text-center text-xs text-ink/65">{emptyLabel}</p>
        )}
    </>
  );
}
