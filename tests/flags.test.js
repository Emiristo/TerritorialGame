import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { addStandaloneFlag, canPlaceStandaloneFlag, createStandaloneFlag, getFlagAtNode } from '../src/game/flags.js';
import { addRoad, createRoad } from '../src/game/roads.js';

describe('standalone flags', () => {
  it('creates a flag as an inter-cell node', () => {
    const f = createStandaloneFlag('f', 'player', 20, 20.5);
    expect(f).toMatchObject({ id: 'f', buildingId: null, ownerId: 'player', x: 20, y: 20.5 });
  });

  it('allows placement at a free inter-cell node inside controlled influence', () => {
    const s = createGameState();
    const f = addStandaloneFlag(s, 'f', 'player', 50, 52.5);
    expect(getFlagAtNode(s, 50, 52.5)).toBe(f);
  });

  it('rejects invalid, unowned, or out-of-influence nodes', () => {
    const s = createGameState();
    expect(canPlaceStandaloneFlag(s, -0.5, 20.5)).toBe(false);
    expect(canPlaceStandaloneFlag(s, 20.5, 20.5)).toBe(false);
    expect(canPlaceStandaloneFlag(s, 20, 20.5)).toBe(false);
    expect(canPlaceStandaloneFlag(s, 60, 50.5)).toBe(false);
  });

  it('rejects an occupied node', () => {
    const s = createGameState();
    addStandaloneFlag(s, 'a', 'player', 50, 52.5);
    expect(canPlaceStandaloneFlag(s, 50, 52.5)).toBe(false);
  });

  it('splits an existing road when a flag is placed between two road cells', () => {
    const s = createGameState();
    addStandaloneFlag(s, 'a', 'player', 50, 52.5);
    addStandaloneFlag(s, 'b', 'player', 55, 52.5);
    addRoad(s, createRoad('road', 'a', 'b', ['50-52', '51-52', '52-52', '53-52', '54-52', '55-52']));
    const f = addStandaloneFlag(s, 'mid', 'player', 53, 52.5);
    expect(f.buildingId).toBeNull();
    expect(s.roads).toHaveLength(2);
    expect(s.roads.some((r) => r.startFlagId === 'a' && r.endFlagId === 'mid' && r.cells.join('|') === '50-52|51-52|52-52')).toBe(true);
    expect(s.roads.some((r) => r.startFlagId === 'mid' && r.endFlagId === 'b' && r.cells.join('|') === '53-52|54-52|55-52')).toBe(true);
  });

  it('keeps the original road unchanged when a split would violate the minimum length', () => {
    const s = createGameState();
    addStandaloneFlag(s, 'a', 'player', 50, 52.5);
    addStandaloneFlag(s, 'b', 'player', 52, 52.5);
    addRoad(s, createRoad('road', 'a', 'b', ['50-52', '51-52', '52-52']));
    const before = s.roads.map((r) => ({ ...r, cells: [...r.cells] }));
    expect(canPlaceStandaloneFlag(s, 51, 52.5)).toBe(false);
    expect(s.roads).toEqual(before);
  });
});
