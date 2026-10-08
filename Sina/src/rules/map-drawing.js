export const MAP_DRAWING_SHAPES = ["arrow", "circle", "cone"];
export const CONE_ANGLES = [30, 60, 90];
export const DEFAULT_CONE_ANGLE = 60;

export function isMapDrawingShape(value) {
  return MAP_DRAWING_SHAPES.includes(value);
}

export function isConeAngle(value) {
  return CONE_ANGLES.includes(value);
}

export function isDrawingCell(value) {
  return Boolean(
    value && Number.isSafeInteger(value.q) && Number.isSafeInteger(value.r),
  );
}

export function isDrawingPoint(value) {
  return Boolean(value && fraction(value.x) && fraction(value.y));
}

export function readMapDrawing(value) {
  const shape = value?.shape ?? MAP_DRAWING_SHAPES[0];
  const angle = value?.angle ?? DEFAULT_CONE_ANGLE;

  if (
    !isMapDrawingShape(shape) ||
    !isConeAngle(angle) ||
    !aimed(value?.from) ||
    !aimed(value?.to)
  ) {
    return null;
  }

  return { shape, angle, from: point(value.from), to: point(value.to) };
}

function fraction(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function aimed(value) {
  return isDrawingCell(value) || isDrawingPoint(value);
}

function point(value) {
  return {
    x: isDrawingPoint(value) ? value.x : null,
    y: isDrawingPoint(value) ? value.y : null,
    q: isDrawingCell(value) ? value.q : null,
    r: isDrawingCell(value) ? value.r : null,
  };
}
