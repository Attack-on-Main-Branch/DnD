import Image from "next/image";

import stillwater from "./banner-art/stillwater.webp";

export default function StillwaterBanner({ sizes }) {
  return (
    <Image
      src={stillwater}
      alt=""
      fill
      sizes={sizes}
      className="object-cover object-[73%_46%]"
    />
  );
}
