import Image from "next/image";

import BannerMotion from "./banner-motion";

import background from "./banner-art/sakura/background.webp";
import branch from "./banner-art/sakura/branch.webp";
import spray from "./banner-art/sakura/spray.webp";
import styles from "./sakura-banner.module.css";

const BRANCHES = [
  { name: "branch", art: branch, className: styles.branch },
  { name: "spray", art: spray, className: styles.spray },
];
const PETALS = Array.from({ length: 28 }, (_, index) => {
  const duration = 14 + (index % 5) * 1.7;
  return {
    "--petal-x": `${64 + ((index * 13) % 43)}%`,
    "--petal-y": `${-12 + ((index * 19) % 53)}%`,
    "--petal-size": `${1.2 + (index % 4) * 0.35}cqw`,
    "--petal-duration": `${duration}s`,
    "--petal-delay": `${-((index * 0.618) % 1) * duration}s`,
    "--petal-drift": `${-48 - (index % 5) * 8}cqw`,
    "--petal-turn": `${(index * 47) % 360}deg`,
    "--flutter-duration": `${3.6 + (index % 4) * 0.7}s`,
  };
});

export default function SakuraBanner({ animated, sizes }) {
  return (
    <BannerMotion className={styles.surface} disabled={!animated}>
      <Image
        src={background}
        alt=""
        fill
        sizes={sizes}
        className={styles.background}
      />
      {BRANCHES.map(({ name, art, className }) => (
        <span
          key={name}
          className={`${styles.bough} ${className}`}
          style={{ aspectRatio: art.width / art.height }}
        >
          <span className={styles.twig}>
            <Image
              src={art}
              alt=""
              fill
              sizes={sizes}
              className="object-contain"
            />
          </span>
        </span>
      ))}
      {animated && (
        <span className={styles.petals}>
          {PETALS.map((style, index) => (
            <span key={index} className={styles.fall} style={style}>
              <span className={styles.petal} />
            </span>
          ))}
        </span>
      )}
      <span className={styles.edge} />
    </BannerMotion>
  );
}
