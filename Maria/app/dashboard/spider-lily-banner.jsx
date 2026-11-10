import Image from "next/image";

import BannerMotion from "./banner-motion";
import { SPIDER_LILY_FRAME, SPIDER_LILY_WIND } from "@/lib/spider-lily-art.mjs";

import background from "./banner-art/spider-lilies/background.webp";
import meadow from "./banner-art/spider-lilies/meadow.webp";
import left from "./banner-art/spider-lilies/left.webp";
import center from "./banner-art/spider-lilies/center.webp";
import gap from "./banner-art/spider-lilies/gap.webp";
import right from "./banner-art/spider-lilies/right.webp";
import frontLeft from "./banner-art/spider-lilies/front-left.webp";
import frontCenter from "./banner-art/spider-lilies/front-center.webp";
import frontGap from "./banner-art/spider-lilies/front-gap.webp";
import frontRight from "./banner-art/spider-lilies/front-right.webp";
import edge from "./banner-art/spider-lilies/edge.webp";
import still from "./banner-art/spider-lilies/still.webp";
import layout from "./banner-art/spider-lilies/layout.json";
import styles from "./spider-lily-banner.module.css";

const WIND_ART = {
  meadow,
  left,
  center,
  gap,
  right,
  "front-left": frontLeft,
  "front-center": frontCenter,
  "front-gap": frontGap,
  "front-right": frontRight,
  edge,
};

const { width, height, groundStart } = SPIDER_LILY_FRAME;
const SURFACE_STYLE = {
  "--lily-aspect": `${width} / ${height}`,
  "--lily-ground-start": `${(groundStart / height) * 100}%`,
  "--lily-still-image": `url("${still.src}")`,
};
const BACKGROUND_STYLE = {
  "--lily-background": `url("${background.src}")`,
};
const LAYERS = SPIDER_LILY_WIND.map((wind) => {
  const bounds = layout[wind.name];
  const [originX, originY] = wind.origin.split(" ").map(parseFloat);
  return {
    name: wind.name,
    style: {
      "--plant-left": `${(bounds.left / width) * 100}%`,
      "--plant-top": `${(bounds.top / height) * 100}%`,
      "--plant-width": `${(bounds.width / width) * 100}%`,
      "--plant-height": `${(bounds.height / height) * 100}%`,
      "--wind-origin": `${(((originX / 100) * width - bounds.left) / bounds.width) * 100}% ${(((originY / 100) * height - bounds.top) / bounds.height) * 100}%`,
      "--wind-duration": wind.duration,
      "--wind-delay": wind.delay,
      "--wind-sway": wind.sway,
      "--flutter-duration": wind.flutterDuration,
      "--flutter-delay": wind.flutterDelay,
    },
    picture: { backgroundImage: `url("${WIND_ART[wind.name].src}")` },
  };
});

export default function SpiderLilyBanner({ animated, sizes }) {
  if (!animated) {
    return (
      <span className={styles.surface} style={SURFACE_STYLE}>
        <Image
          src={still}
          alt=""
          fill
          sizes={sizes}
          className="object-cover object-bottom"
        />
      </span>
    );
  }

  return (
    <BannerMotion className={styles.surface} style={SURFACE_STYLE}>
      <span className={styles.background} style={BACKGROUND_STYLE} />
      <span className={styles.garden}>
        {LAYERS.map(({ name, style, picture }) => (
          <span key={name} className={styles.layer} style={style}>
            <span className={styles.flower} style={picture} />
          </span>
        ))}
      </span>
    </BannerMotion>
  );
}
