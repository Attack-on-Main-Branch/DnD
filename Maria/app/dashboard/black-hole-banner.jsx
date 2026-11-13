import Image from "next/image";

import blackHole from "./banner-art/black-hole.webp";
import BannerMotion from "./banner-motion";

import styles from "./black-hole-banner.module.css";

export default function BlackHoleBanner({ animated, sizes }) {
  return (
    <BannerMotion className="absolute inset-0" disabled={!animated}>
      <Image src={blackHole} alt="" fill sizes={sizes} className={styles.art} />
    </BannerMotion>
  );
}
