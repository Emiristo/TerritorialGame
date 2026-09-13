import { describe, expect, it } from 'vitest';
import { createFlag } from '../src/game/flags.js';
import {
  addCargoToFlag,
  getFlagCargo,
  getFlagCargoCapacity,
  getFlagCargoCountForFlag,
  getFlagFreeCargoCapacityForFlag,
  removeCargoFromFlag,
} from '../src/game/carriers.js';

function makeState() {
  return {
    flags: [createFlag('flag-1', null, 'player', 1, 1)],
  };
}

describe('flag cargo capacity', () => {
  it('has a fixed capacity of 20 physical resource units', () => {
    const state = makeState();

    expect(getFlagCargoCapacity()).toBe(20);
    expect(getFlagCargoCountForFlag(state, 'flag-1')).toBe(0);
    expect(getFlagFreeCargoCapacityForFlag(state, 'flag-1')).toBe(20);

    expect(addCargoToFlag(state, 'flag-1', 'stone', 20)).toBe(20);
    expect(getFlagCargo(state, 'flag-1', 'stone')).toBe(20);
    expect(getFlagCargoCountForFlag(state, 'flag-1')).toBe(20);
    expect(getFlagFreeCargoCapacityForFlag(state, 'flag-1')).toBe(0);
  });

  it('rejects cargo that would exceed total capacity without partial delivery', () => {
    const state = makeState();

    expect(addCargoToFlag(state, 'flag-1', 'stone', 19)).toBe(19);
    expect(addCargoToFlag(state, 'flag-1', 'wood', 2)).toBe(0);
    expect(getFlagCargo(state, 'flag-1', 'stone')).toBe(19);
    expect(getFlagCargo(state, 'flag-1', 'wood')).toBe(0);
    expect(getFlagCargoCountForFlag(state, 'flag-1')).toBe(19);
    expect(getFlagFreeCargoCapacityForFlag(state, 'flag-1')).toBe(1);
  });

  it('frees capacity when cargo leaves the flag', () => {
    const state = makeState();

    expect(addCargoToFlag(state, 'flag-1', 'stone', 20)).toBe(20);
    expect(removeCargoFromFlag(state, 'flag-1', 'stone', 5)).toBe(5);
    expect(getFlagCargoCountForFlag(state, 'flag-1')).toBe(15);
    expect(getFlagFreeCargoCapacityForFlag(state, 'flag-1')).toBe(5);
    expect(addCargoToFlag(state, 'flag-1', 'wood', 5)).toBe(5);
    expect(getFlagCargoCountForFlag(state, 'flag-1')).toBe(20);
  });
});
