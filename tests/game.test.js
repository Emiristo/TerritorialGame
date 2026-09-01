import { describe, expect, it } from 'vitest';
import { createGameState, MAP_WIDTH, MAP_HEIGHT, CAPITAL_X, CAPITAL_Y, HEADQUARTERS_CENTER_X, HEADQUARTERS_CENTER_Y, HEADQUARTERS_INFLUENCE_RADIUS } from '../src/game/state.js';
import { TERRAIN_BY_ID } from '../src/game/terrain.js';
import { INFLUENCE_RADIUS, isWithinInfluenceRadius } from '../src/game/influence.js';
import { WORKER_TYPES, createWorkZone, createWorker, assignWorkerToBuilding, extractForWorker } from '../src/game/workers.js';
import { BUILDING_TYPES, addBuilding, canBuildOnTile, createBuilding, getFootprintTiles } from '../src/game/buildings.js';
import { createTerritorySource, addTerritorySource, getOwnedTiles } from '../src/game/territory.js';

describe('building specifications', () => {
  const expected = {
    headquarters: [3, 3, {}], warehouse: [3, 3, { planks: 3, stone: 3 }], forester_hut: [2, 2, { planks: 2 }], stonecutter_hut: [2, 2, { planks: 2 }],
    sawmill: [2, 3, { planks: 2, stone: 2 }], well: [2, 2, { planks: 2 }], farm: [4, 4, { planks: 4, stone: 3 }], mill: [2, 2, { planks: 2, stone: 2 }],
    bakery: [2, 2, { planks: 2, stone: 2 }], coal_mine: [2, 2, { planks: 4 }], iron_mine: [2, 2, { planks: 4 }], gold_mine: [2, 2, { planks: 4 }],
    marble_mine: [2, 2, { planks: 4 }], foundry: [2, 2, { planks: 2, stone: 2 }], forge: [2, 2, { planks: 2, stone: 2 }], workshop: [3, 3, { planks: 2, stone: 2 }],
    mint: [2, 2, { planks: 2, stone: 2 }], outpost: [2, 2, { planks: 3 }], barracks: [3, 3, { planks: 3, stone: 1 }], watchtower: [2, 2, { planks: 5, stone: 5 }], fortress: [5, 5, { planks: 10, stone: 10 }],
  };
  it('defines exactly the 21 agreed building types', () => expect(Object.keys(BUILDING_TYPES)).toHaveLength(21));
  for (const [id, [width, height, cost]] of Object.entries(expected)) it(`matches ${id} size and cost`, () => { const type = Object.values(BUILDING_TYPES).find((item) => item.id === id); expect(type).toBeDefined(); expect(type.width).toBe(width); expect(type.height).toBe(height); expect(type.cost).toEqual(cost); });
  it('keeps regular buildings on plains and mines on hills or mountains', () => {
    for (const type of Object.values(BUILDING_TYPES)) {
      if (type.role === 'military' || type.id === 'headquarters') continue;
      if (type.role === 'extraction' && type.workerTypeId === 'miner') expect(type.terrainIds).toEqual(['hills', 'mountains']);
      else expect(type.terrainIds).toEqual(['plains']);
    }
  });
  it('keeps the agreed work-zone and military values', () => {
    expect(BUILDING_TYPES.FORESTER_HUT.workRadius).toBe(8); expect(BUILDING_TYPES.STONECUTTER_HUT.workRadius).toBe(5); expect(BUILDING_TYPES.SAWMILL.workRadius).toBe(5);
    expect(BUILDING_TYPES.COAL_MINE.workRadius).toBe(5); expect(BUILDING_TYPES.IRON_MINE.workRadius).toBe(5); expect(BUILDING_TYPES.GOLD_MINE.workRadius).toBe(5); expect(BUILDING_TYPES.MARBLE_MINE.workRadius).toBe(5);
    expect(BUILDING_TYPES.FARM.workArea).toEqual({ width: 4, height: 4, usableCells: 14 });
    expect(BUILDING_TYPES.OUTPOST).toMatchObject({ requiredSoldiers: 1, influenceMultiplier: 0.75 }); expect(BUILDING_TYPES.BARRACKS).toMatchObject({ requiredSoldiers: 3, influenceMultiplier: 1 });
    expect(BUILDING_TYPES.WATCHTOWER).toMatchObject({ requiredSoldiers: 6, influenceMultiplier: 1.25 }); expect(BUILDING_TYPES.FORTRESS).toMatchObject({ requiredSoldiers: 9, influenceMultiplier: 1.5, blockChanceBonus: 0.05 });
  });
});

describe('map and headquarters', () => {
  it('creates a 100x100 map', () => { const state = createGameState(); expect(state.tiles).toHaveLength(10000); expect(MAP_WIDTH).toBe(100); expect(MAP_HEIGHT).toBe(100); });
  it('creates a 3x3 headquarters at the map centre', () => { const state = createGameState(); const headquarters = state.buildings.find((item) => item.typeId === BUILDING_TYPES.HEADQUARTERS.id); expect(headquarters).toBeDefined(); expect(headquarters.tileId).toBe(`${CAPITAL_X}-${CAPITAL_Y}`); expect(getFootprintTiles(state, headquarters.typeId, headquarters.tileId)).toHaveLength(9); expect(HEADQUARTERS_CENTER_X).toBe(50); expect(HEADQUARTERS_CENTER_Y).toBe(50); });
  it('gives the headquarters an influence radius of 10', () => { const state = createGameState(); const source = state.territorySources.find((item) => item.id === 'headquarters-player'); expect(source.radius).toBe(10); expect(HEADQUARTERS_INFLUENCE_RADIUS).toBe(10); const center = state.tiles.find((tile) => tile.id === '50-50'); expect(state.tiles.find((tile) => tile.id === '60-50').ownerId).toBe('player'); expect(state.tiles.find((tile) => tile.id === '61-50').ownerId).not.toBe('player'); expect(center.ownerId).toBe('player'); });
});

describe('terrain and resources', () => {
  it('defines the core terrain types', () => { expect(TERRAIN_BY_ID.plains).toBeDefined(); expect(TERRAIN_BY_ID.forest).toBeDefined(); expect(TERRAIN_BY_ID.hills).toBeDefined(); expect(TERRAIN_BY_ID.mountains).toBeDefined(); expect(TERRAIN_BY_ID.water).toBeDefined(); });
  it('uses nine units as the base resource reserve', () => { const forest = createGameState().tiles.find((tile) => tile.terrain === 'forest'); expect(forest.resources.wood).toBe(9); });
});

describe('workers and work zones', () => {
  it('keeps work zones at radius five by default', () => { expect(createWorkZone('zone-1', 'player', '0-0').radius).toBe(5); expect(INFLUENCE_RADIUS).toBe(10); expect(isWithinInfluenceRadius({ x: 0, y: 0 }, { x: 10, y: 0 }, 10)).toBe(true); expect(isWithinInfluenceRadius({ x: 0, y: 0 }, { x: 11, y: 0 }, 10)).toBe(false); });
  it('creates a worker and requires a matching building', () => { const state = createGameState(); const worker = createWorker('worker-1', 'player', WORKER_TYPES.LUMBERJACK.id); state.workers.push(worker); expect(() => assignWorkerToBuilding(state, worker.id, state.buildings[0].id)).toThrow(); });
});

describe('building placement', () => {
  it('validates the complete footprint', () => { const state = createGameState(); const plain = state.tiles.find((tile) => tile.terrain === 'plains' && tile.ownerId === 'player' && tile.x < 40 && tile.y < 40); expect(plain).toBeDefined(); const footprint = getFootprintTiles(state, BUILDING_TYPES.WAREHOUSE.id, plain.id); expect(footprint).toHaveLength(9); });
  it('rejects regular buildings outside plains and mines outside hills/mountains', () => { const state = createGameState(); const forest = state.tiles.find((tile) => tile.terrain === 'forest'); const hill = state.tiles.find((tile) => tile.terrain === 'hills'); const plain = state.tiles.find((tile) => tile.terrain === 'plains'); expect(canBuildOnTile(state, BUILDING_TYPES.WAREHOUSE.id, forest.id)).toBe(false); expect(canBuildOnTile(state, BUILDING_TYPES.WAREHOUSE.id, plain.id)).toBe(false); expect(canBuildOnTile(state, BUILDING_TYPES.IRON_MINE.id, hill.id)).toBe(false); });
});

describe('territories', () => {
  it('supports a custom source radius', () => { const source = createTerritorySource('test', 'player', '50-50', 1, 10); expect(source.radius).toBe(10); });
  it('expands territory from a source', () => { const state = createGameState(); const before = getOwnedTiles(state, 'player').length; addTerritorySource(state, createTerritorySource('extra', 'player', '80-80', 1, 5)); expect(getOwnedTiles(state, 'player').length).toBeGreaterThan(before); });
});
