export const MAX_TOKEN_HP = 10000;

export function parseTokenMaxHp(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= MAX_TOKEN_HP
    ? number
    : undefined;
}

export function validTokenHealthDelta(delta) {
  return (
    Number.isInteger(delta) && delta !== 0 && Math.abs(delta) <= MAX_TOKEN_HP
  );
}
