export const FLAG_CARGO_CAPACITY = 20;

export function getFlagCargoCapacity() {
  return FLAG_CARGO_CAPACITY;
}

export function getFlagCargoCount(flag) {
  return Object.values(flag?.cargo ?? {})
    .reduce((total, amount) => total + Math.max(0, Number(amount) || 0), 0);
}

export function getFlagFreeCargoCapacity(flag) {
  return Math.max(0, FLAG_CARGO_CAPACITY - getFlagCargoCount(flag));
}
