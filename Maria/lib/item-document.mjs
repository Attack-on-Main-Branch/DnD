import { itemDocumentGestureScript } from "./item-document-gestures.mjs";

// Never add allow-same-origin: uploaded scripts must not share the app's origin.
export const ITEM_DOCUMENT_SANDBOX = "allow-scripts";

const VIEWPORT_WIDTH = 1920;
export const ITEM_DOCUMENT_VIEWPORT = {
  width: VIEWPORT_WIDTH,
  height: (VIEWPORT_WIDTH * 9) / 16,
};

const POLICY = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

export function itemDocumentSource(
  html,
  { color, background, accent, fontFamily },
) {
  const style = `:root { color-scheme: dark; --color-ink: ${color}; --color-surface: ${background}; --color-gold: ${accent}; }
html { color: var(--color-ink); background: var(--color-surface); font-family: ${fontFamily}; }
body { margin: 0; overflow-wrap: anywhere; }
img, svg, video { max-width: 100%; }
a { color: var(--color-gold); }
html[data-item-gestures], html[data-item-gestures] * { touch-action: none !important; }`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${POLICY}"><style>${style}</style><script>${itemDocumentGestureScript()}</script></head><body>${html}</body></html>`;
}
