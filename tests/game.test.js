import { describe, expect, it } from 'vitest';
import { createGameState, MAP_WIDTH, MAP_HEIGHT } from '../src/game/state.js';
import { TERRAIN_BY_ID } from '../src/game/terrain.js';
import { getTilesInRadius } from '../src/game/influence.js';
import { WORK_ZONE_RADIUS, createWorkZone, canWorkTile } from '../src/game/workZones.js';
import { getResourceAmount, gatherResource } from '../src/game/resources.js';

describe('game state', () => {
  it('creates the expected map dimensions', () => {
    const state = createGameState();
    expect(state.tiles).toHaveLength(MAP_WIDTH * MAP_HEIGHT);
  });

  it('creates a valid starting capital', () => {
    const state = createGameState();
    const capital = state.tiles.find((tile) => tile.ownerId === 'player');
    expect(capital).toBeDefined();
    expect(capital.influence.player).toBe(1);
  });
});

describe('terrain and resources', () => {
  it('defines the core terrain types', () => {
    expect(TERRAIN_BY_ID.plains).toBeDefined();
    expect(TERRAIN_BY_ID.forest).toBeDefined();
    expect(TERRAIN_BY_ID.hills).toBeDefined();
    expect(TERRAIN_BY_ID.mountains).toBeDefined();
    expect(TERRAIN_BY_ID.water).toBeDefined();
  });

  it('uses nine units as the base resource reserve', () => {
    const state = createGameState();
    const forest = state.tiles.find((tile) => tile.terrain === 'forest');
    if (!forest) throw new Error('No forest tile in generated map');
    expect(getResourceAmount(forest, 'wood')).toBe(9);
  });

  it('gathering one resource consumes one unit', () => {
    const tile = { resources: { wood: 9, stone: 0, ore: 0, food: 0 } };
    expect(gatherResource(tile, 'wood', 1)).toBe(1);
    expect(tile.resources.wood).toBe(8);
  });
});

describe('influence and work zones', () => {
  it('uses a radius of five cells for influence', () => {
    const tiles = Array.from({ length: 11 }, (_, x) => ({ id: `${x}-0`, x, y: 0 }));
    const covered = getTilesInRadius(tiles, 5, 0, 0);
    expect(covered.map((tile) => tile.x)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('uses the same five-cell radius for work zones', () => {
    expect(WORK_ZONE_RADIUS).toBe(5);
    const zone = createWorkZone('player', '0-0');
    expect(zone.radius).toBe(5);
  });

  it('allows a tile inside the work zone', () => {
    const zone = createWorkZone('player', '0-0');
    expect(canWorkTile(zone, { x: 3, y: 4 })).toBe(true);
  });
});
