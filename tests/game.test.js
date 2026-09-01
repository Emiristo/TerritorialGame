import { describe, expect, it } from 'vitest';
import { createGameState, MAP_WIDTH, MAP_HEIGHT, HEADQUARTERS_INFLUENCE_RADIUS, STARTER_FOREST_AREA, STARTER_STONE_AREA, STARTER_HILLS_AREA, STARTER_MOUNTAINS_AREA } from '../src/game/state.js';
import { BUILDING_TYPES, canBuildOnTile, getFootprintTiles } from '../src/game/buildings.js';
import { INFLUENCE_RADIUS, isWithinInfluenceRadius } from '../src/game/influence.js';
import { WORKER_TYPES, createWorker, createWorkZone, assignWorkerToBuilding } from '../src/game/workers.js';
import { createTerritorySource, addTerritorySource, getOwnedTiles } from '../src/game/territory.js';

describe('starter map', () => {
  it('creates a 100x100 map', () => { const state = createGameState(); expect(state.tiles).toHaveLength(MAP_WIDTH * MAP_HEIGHT); });
  it('keeps headquarters influence at radius 10', () => { const state = createGameState(); expect(state.rules.headquartersInfluenceRadius).toBe(HEADQUARTERS_INFLUENCE_RADIUS); expect(HEADQUARTERS_INFLUENCE_RADIUS).toBe(10); });
  it('contains the dedicated forest, stone, hills and mountain test areas', () => { const state = createGameState(); const center = (area) => state.tiles.find((t) => t.x >= area.minX && t.x <= area.maxX && t.y >= area.minY && t.y <= area.maxY); expect(center(STARTER_FOREST_AREA).terrain).toBe('forest'); expect(center(STARTER_STONE_AREA).terrain).toBe('hills'); expect(center(STARTER_HILLS_AREA).terrain).toBe('hills'); expect(center(STARTER_MOUNTAINS_AREA).terrain).toBe('mountains'); });
});

describe('buildings', () => {
  it('defines exactly the 21 agreed building types', () => { expect(Object.keys(BUILDING_TYPES)).toHaveLength(21); });
  it('allows regular buildings on plains and rejects them on forest', () => { const state = createGameState(); const plain = state.tiles.find((t) => t.x >= 35 && t.x <= 45 && t.y >= 45 && t.y <= 55 && t.terrain === 'plains'); const forest = state.tiles.find((t) => t.terrain === 'forest'); expect(canBuildOnTile(state, BUILDING_TYPES.WAREHOUSE.id, plain.id)).toBe(true); expect(canBuildOnTile(state, BUILDING_TYPES.WAREHOUSE.id, forest.id)).toBe(false); });
  it('allows mines on hills and mountains', () => { const state = createGameState(); const hills = state.tiles.find((t) => t.terrain === 'hills' && t.x >= 43 && t.x <= 44 && t.y >= 54 && t.y <= 55); const mountains = state.tiles.find((t) => t.terrain === 'mountains' && t.x >= 56 && t.x <= 57 && t.y >= 43 && t.y <= 44); expect(canBuildOnTile(state, BUILDING_TYPES.IRON_MINE.id, hills.id)).toBe(true); expect(canBuildOnTile(state, BUILDING_TYPES.IRON_MINE.id, mountains.id)).toBe(true); });
  it('calculates the complete footprint for a building', () => { const state = createGameState(); const plain = state.tiles.find((t) => t.x >= 35 && t.x <= 45 && t.y >= 45 && t.y <= 55 && t.terrain === 'plains'); expect(getFootprintTiles(state, BUILDING_TYPES.WAREHOUSE.id, plain.id)).toHaveLength(9); });
});

describe('workers and work zones', () => {
  it('uses radius five for work zones', () => { expect(createWorkZone('z', 'player', '50-50').radius).toBe(5); });
  it('rejects an incompatible worker', () => { const state = createGameState(); const worker = createWorker('w', 'player', WORKER_TYPES.LUMBERJACK.id); state.workers.push(worker); expect(() => assignWorkerToBuilding(state, worker.id, state.buildings[0].id)).toThrow(); });
});

describe('territory', () => {
  it('uses the normal influence radius of five', () => { expect(INFLUENCE_RADIUS).toBe(5); expect(isWithinInfluenceRadius({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(true); expect(isWithinInfluenceRadius({ x: 0, y: 0 }, { x: 6, y: 0 })).toBe(false); });
  it('expands from an additional source', () => { const state = createGameState(); const before = getOwnedTiles(state, 'player').length; addTerritorySource(state, createTerritorySource('extra', 'player', '80-80', 1, 5)); expect(getOwnedTiles(state, 'player').length).toBeGreaterThan(before); });
});
