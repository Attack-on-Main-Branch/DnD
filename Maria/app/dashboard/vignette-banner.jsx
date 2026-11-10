import { diceColorHex } from "./character-presentation";

import styles from "./vignette-banner.module.css";

export default function VignetteBanner({ diceColor }) {
  return (
    <span
      className={styles.surface}
      style={{ "--vignette-color": diceColorHex(diceColor) }}
    />
  );
}
