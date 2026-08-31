import { describe, expect, it } from 'vitest';
import { createGameState, MAP_WIDTH, MAP_HEIGHT } from '../src/game/state.js';
import { TERRAIN_BY_ID } from '../src/game/terrain.js';
import { INFLUENCE_RADIUS, isWithinInfluenceRadius } from '../src/game/influence.js';
import { WORKER_TYPES, createWorkZone, isTileInWorkZone, extractOneResource } from '../src/game/workZones.js';

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
    expect(forest.resources.wood).toBe(9);
  });

  it('extracting one resource consumes one unit', () => {
    const tile = { resources: { wood: 9, stone: 0, ore: 0, food: 0 } };
    expect(extractOneResource(tile, WORKER_TYPES.LUMBERJACK.id)).toBe('wood');
    expect(tile.resources.wood).toBe(8);
  });
});

describe('influence and work zones', () => {
  it('uses a radius of five cells for influence', () => {
    const center = { x: 0, y: 0 };
    expect(INFLUENCE_RADIUS).toBe(5);
    expect(isWithinInfluenceRadius(center, { x: 5, y: 0 })).toBe(true);
    expect(isWithinInfluenceRadius(center, { x: 6, y: 0 })).toBe(false);
  });

  it('uses the same five-cell radius for work zones', () => {
    const zone = createWorkZone('zone-1', 'player', '0-0', 'lumberjack');
    expect(zone.radius).toBe(5);
  });

  it('allows a tile inside the work zone', () => {
    const zone = createWorkZone('zone-1', 'player', '0-0', 'lumberjack');
    expect(isTileInWorkZone(zone, { x: 0, y: 0 }, { x: 3, y: 4 })).toBe(true);
  });
});
