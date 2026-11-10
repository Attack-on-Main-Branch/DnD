import assert from "node:assert/strict";
import { test } from "node:test";
import { createContourCleaner } from "./contour-cleaner.mjs";

function picture(width = 40, height = 24) {
  const pixels = new Uint8Array(width * height * 4);
  for (let index = 3; index < pixels.length; index += 4) pixels[index] = 255;
  return {
    pixels,
    width,
    height,
    put(x, y, value = 255) {
      pixels[(y * width + x) * 4] =
        pixels[(y * width + x) * 4 + 1] =
        pixels[(y * width + x) * 4 + 2] =
          value;
    },
    at(x, y) {
      return pixels[(y * width + x) * 4];
    },
  };
}

test("isolated dots and their antialiased edges disappear without thinning connected contours", () => {
  const cleaner = createContourCleaner();
  const image = picture();
  image.put(5, 5);
  image.put(6, 5, 20);
  for (let x = 10; x < 35; x++) {
    image.put(x, 12);
    image.put(x, 13, 80);
    image.put(x, 14, 15);
  }
  const original = image.pixels.slice();
  cleaner.clean(image.pixels, image.width, image.height, 4);
  assert.equal(image.at(5, 5), 0);
  assert.equal(image.at(6, 5), 0);
  for (let x = 10; x < 35; x++) {
    for (let y = 12; y <= 14; y++) {
      assert.equal(image.at(x, y), original[(y * image.width + x) * 4]);
    }
  }
});

test("small closed loops fade as whole shapes before they can shrink into dots", () => {
  const cleaner = createContourCleaner();
  const opacities = [];
  for (const size of [3, 4, 5, 6, 7, 8]) {
    const image = picture();
    for (let i = 0; i < size; i++) {
      image.put(10 + i, 8);
      image.put(10 + i, 8 + size - 1);
      image.put(10, 8 + i);
      image.put(10 + size - 1, 8 + i);
    }
    cleaner.clean(image.pixels, image.width, image.height, 4);
    const values = new Set();
    for (let i = 0; i < size; i++) values.add(image.at(10 + i, 8));
    assert.equal(values.size, 1);
    opacities.push(image.at(10, 8));
  }
  assert.deepEqual(opacities.slice(0, 2), [0, 0]);
  assert.equal(opacities.at(-1), 255);
  assert.ok(
    opacities.every(
      (value, index) => index === 0 || value >= opacities[index - 1],
    ),
  );
});

test("diagonal lines and contours entering the banner stay connected", () => {
  const cleaner = createContourCleaner();
  const image = picture();
  for (let i = 0; i < 10; i++) image.put(10 + i, 5 + i);
  image.put(0, 18);
  image.put(1, 18);
  cleaner.clean(image.pixels, image.width, image.height, 4);
  for (let i = 0; i < 10; i++) assert.equal(image.at(10 + i, 5 + i), 255);
  assert.equal(image.at(1, 18), 255);
  cleaner.dispose();
  image.put(30, 20);
  cleaner.clean(image.pixels, image.width, image.height, 4);
  assert.equal(image.at(30, 20), 255);
});
