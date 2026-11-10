import { diceColorHex } from "./character-presentation";

import styles from "./splash-banner.module.css";

export default function SplashBanner({ diceColor }) {
  return (
    <span
      className={styles.surface}
      style={{ "--splash-color": diceColorHex(diceColor) }}
    />
  );
}
