export function drawingGeometry(width, height, from, to) {
  if (!from || !to || width <= 0 || height <= 0) {
    return null;
  }

  const start = { x: from.x * width, y: from.y * height };
  const end = { x: to.x * width, y: to.y * height };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  return Number.isFinite(length) && length > 0
    ? { start, end, length, angle: Math.atan2(dy, dx) }
    : null;
}

export function conePath({ start, length, angle }, degrees) {
  const half = (degrees * Math.PI) / 360;
  const left = {
    x: start.x + Math.cos(angle - half) * length,
    y: start.y + Math.sin(angle - half) * length,
  };
  const right = {
    x: start.x + Math.cos(angle + half) * length,
    y: start.y + Math.sin(angle + half) * length,
  };

  return `M ${start.x} ${start.y} L ${left.x} ${left.y} A ${length} ${length} 0 0 1 ${right.x} ${right.y} Z`;
}
