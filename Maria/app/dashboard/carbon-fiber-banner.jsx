import Image from "next/image";

import carbonFiber from "./banner-art/carbon-fiber.webp";

export default function CarbonFiberBanner({ sizes }) {
  return (
    <Image
      src={carbonFiber}
      alt=""
      fill
      sizes={sizes}
      className="object-cover object-right-top"
    />
  );
}
