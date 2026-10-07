export function tokenSectors(tokens) {
  const cells = new Map();
  const sectors = new Map();
  for (const token of tokens) {
    if (token.isPartyMarker) continue;
    const key =
      Number.isInteger(token.q) && Number.isInteger(token.r)
        ? `${token.q}:${token.r}`
        : `${token.x}:${token.y}`;
    const group = cells.get(key) ?? [];
    group.push(token);
    cells.set(key, group);
  }
  for (const group of cells.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.id.localeCompare(b.id));
    group.forEach((token, index) =>
      sectors.set(token.id, sectorClip(index, group.length)),
    );
  }
  return sectors;
}

export function sectorClip(index, count) {
  const start = -Math.PI / 2 + (index * Math.PI * 2) / count;
  const span = (Math.PI * 2) / count;
  const steps = Math.ceil(64 / count);
  const points = ["50% 50%"];
  for (let step = 0; step <= steps; step++) {
    const angle = start + (span * step) / steps;
    points.push(`${50 + Math.cos(angle) * 50}% ${50 + Math.sin(angle) * 50}%`);
  }
  return `polygon(${points.join(", ")})`;
}
