import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import {
  addStandaloneFlag,
  canPlaceStandaloneFlag,
  createStandaloneFlag,
  getFlagAtTile,
} from '../src/game/flags.js';

function setOwner(state, x, y, ownerId = 'player') {
  const tile = state.tiles.find((item) => item.x === x && item.y === y);
  tile.ownerId = ownerId;
  return tile;
}

describe('standalone flags', () => {
  it('creates a standalone flag with no building binding', () => {
    const flag = createStandaloneFlag('standalone-1', 'player', 20, 20);

    expect(flag).toMatchObject({
      id: 'standalone-1',
      buildingId: null,
      ownerId: 'player',
      x: 20,
      y: 20,
    });
    expect(flag.roadIds).toEqual([]);
    expect(flag.connected).toBe(false);
  });

  it('allows placement on a free tile owned by the player', () => {
    const state = createGameState();
    setOwner(state, 20, 20);

    expect(canPlaceStandaloneFlag(state, 20, 20)).toBe(true);
    const flag = addStandaloneFlag(state, 'standalone-1', 'player', 20, 20);

    expect(flag.buildingId).toBeNull();
    expect(getFlagAtTile(state, '20-20')).toBe(flag);
  });

  it('rejects placement outside the map', () => {
    const state = createGameState();

    expect(canPlaceStandaloneFlag(state, -1, 20)).toBe(false);
    expect(canPlaceStandaloneFlag(state, 100, 20)).toBe(false);
    expect(canPlaceStandaloneFlag(state, 20, 100)).toBe(false);
  });

  it('rejects placement on a tile not owned by the player', () => {
    const state = createGameState();

    expect(canPlaceStandaloneFlag(state, 20, 20)).toBe(false);
    expect(() => addStandaloneFlag(state, 'standalone-1', 'player', 20, 20)).toThrow(
      'Standalone flag cannot be placed on this tile',
    );
  });

  it('rejects placement on an existing flag tile', () => {
    const state = createGameState();
    setOwner(state, 20, 20);
    addStandaloneFlag(state, 'standalone-1', 'player', 20, 20);

    expect(canPlaceStandaloneFlag(state, 20, 20)).toBe(false);
    expect(() => addStandaloneFlag(state, 'standalone-2', 'player', 20, 20)).toThrow(
      'Standalone flag cannot be placed on this tile',
    );
  });

  it('rejects placement inside a building footprint', () => {
    const state = createGameState();
    setOwner(state, 49, 49);

    expect(canPlaceStandaloneFlag(state, 50, 50)).toBe(false);
    expect(() => addStandaloneFlag(state, 'standalone-1', 'player', 50, 50)).toThrow(
      'Standalone flag cannot be placed on this tile',
    );
  });
});
