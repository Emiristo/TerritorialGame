import { describe, expect, it } from 'vitest';
import { createWorldMap } from '../src/game/world/worldMap.js';
import { recalculateTerritories } from '../src/game/territory.js';
import { getMilitaryTerritorySources } from '../src/game/military.js';

describe('military territory integration', () => {
  it('uses the existing worldMap geometry and military building radius', () => {
    const state = {
      worldMap: createWorldMap(9, 9),
      buildings: [{ id: 'b1', ownerId: 'p1', typeId: 'barracks', tileId: '4-4', active: true }],
    };

    const sources = getMilitaryTerritorySources(state);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      id: 'military:b1',
      ownerId: 'p1',
      tileId: '4-4',
      radius: 20,
      influence: 1,
      sourceType: 'military-building',
    });

    recalculateTerritories(state);
    expect(state.worldMap.tiles.find((tile) => tile.id === '0-0').ownerId).toBe('p1');
    expect(state.worldMap.tiles.find((tile) => tile.id === '8-8').ownerId).toBe('p1');
  });

  it('does not create influence from inactive military buildings', () => {
    const state = {
      worldMap: createWorldMap(9, 9),
      buildings: [{ id: 'b1', ownerId: 'p1', typeId: 'barracks', tileId: '4-4', active: false }],
    };

    expect(getMilitaryTerritorySources(state)).toEqual([]);
    recalculateTerritories(state);
    expect(state.worldMap.tiles.every((tile) => tile.ownerId === null)).toBe(true);
  });
});
