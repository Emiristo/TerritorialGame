import { describe, expect, it } from 'vitest';
import { createGameState, MAP_WIDTH, MAP_HEIGHT, HEADQUARTERS_INFLUENCE_RADIUS, STARTER_FOREST_AREA, STARTER_STONE_AREA, STARTER_HILLS_AREA, STARTER_MOUNTAINS_AREA } from '../src/game/state.js';
import { BUILDING_TYPES, BUILD_TIME_PER_PLANK, BUILD_TIME_PER_STONE, advanceConstruction, getConstructionTime, canBuildOnTile, getFootprintTiles, getReservedTiles, isReservedForBuilding } from '../src/game/buildings.js';
import { createGameClock, startGameClock, tickGameClock } from '../src/game/clock.js';
import { startConstruction, advanceConstruction as advanceClockConstruction } from '../src/game/construction.js';
import { INFLUENCE_RADIUS, isWithinInfluenceRadius } from '../src/game/influence.js';
import { WORKER_TYPES, createWorker, createWorkZone, assignWorkerToBuilding } from '../src/game/workers.js';
import { createTerritorySource, addTerritorySource, getOwnedTiles } from '../src/game/territory.js';

describe('game clock and construction integration', () => {
  it('starts at zero and advances by elapsed seconds', () => { const clock = createGameClock(); expect(clock.elapsedSeconds).toBe(0); startGameClock(clock, 1000); tickGameClock(clock, 3500); expect(clock.elapsedSeconds).toBe(2.5); });
  it('advances multiple constructions from one shared clock', () => { const clock = createGameClock(); const state = { clock, buildings: [{ id: 'a', remainingConstructionTime: 5, constructionComplete: false, active: false, lastConstructionUpdateAt: 1000 }, { id: 'b', remainingConstructionTime: 2, constructionComplete: false, active: false, lastConstructionUpdateAt: 1000 }] }; startGameClock(clock, 1000); const completed = advanceClockConstruction(state, 2000); expect(completed).toHaveLength(0); expect(state.buildings[0].remainingConstructionTime).toBe(4); expect(state.buildings[1].remainingConstructionTime).toBe(1); const completedAt3000 = advanceClockConstruction(state, 3000); expect(completedAt3000).toHaveLength(1); expect(state.buildings[1].constructionComplete).toBe(true); expect(state.buildings[1].active).toBe(true); });
});

describe('construction time', () => {
  it('uses 10 seconds per plank and 15 seconds per stone', () => { expect(BUILD_TIME_PER_PLANK).toBe(10); expect(BUILD_TIME_PER_STONE).toBe(15); });
  it('calculates time from construction resources', () => { expect(getConstructionTime({ planks: 2, stone: 2 })).toBe(50); expect(getConstructionTime({ planks: 10, stone: 10 })).toBe(250); expect(getConstructionTime({ planks: 4 })).toBe(40); });
  it('counts construction down in real time and activates at zero', () => { const building = { constructionTime: 75, remainingConstructionTime: 75, constructionComplete: false, active: false }; advanceConstruction(building, 25); expect(building.remainingConstructionTime).toBe(50); expect(building.constructionComplete).toBe(false); expect(building.active).toBe(false); advanceConstruction(building, 49); expect(building.remainingConstructionTime).toBe(1); advanceConstruction(building, 1); expect(building.remainingConstructionTime).toBe(0); expect(building.constructionComplete).toBe(true); expect(building.active).toBe(true); });
  it('does not move the timer backwards or below zero', () => { const building = { constructionTime: 20, remainingConstructionTime: 20, constructionComplete: false, active: false }; advanceConstruction(building, 0); expect(building.remainingConstructionTime).toBe(20); advanceConstruction(building, -5); expect(building.remainingConstructionTime).toBe(20); advanceConstruction(building, 100); expect(building.remainingConstructionTime).toBe(0); });
  it('starts construction with a clock timestamp', () => { const building = { remainingConstructionTime: 5, constructionComplete: false, active: false }; startConstruction({}, building, 5000); expect(building.constructionStartedAt).toBe(5000); expect(building.lastConstructionUpdateAt).toBe(5000); });
});

describe('starter map', () => {
  it('creates a 100x100 map', () => { const state = createGameState(); expect(state.tiles).toHaveLength(MAP_WIDTH * MAP_HEIGHT); });
  it('keeps headquarters influence at radius 10', () => { const state = createGameState(); expect(state.rules.headquartersInfluenceRadius).toBe(HEADQUARTERS_INFLUENCE_RADIUS); expect(HEADQUARTERS_INFLUENCE_RADIUS).toBe(10); });
  it('contains the dedicated forest, stone, hills and mountain test areas', () => { const state = createGameState(); const center = (area) => state.tiles.find((t) => t.x >= area.minX && t.x <= area.maxX && t.y >= area.minY && t.y <= area.maxY); expect(center(STARTER_FOREST_AREA).terrain).toBe('forest'); expect(center(STARTER_STONE_AREA).terrain).toBe('hills'); expect(center(STARTER_HILLS_AREA).terrain).toBe('hills'); expect(center(STARTER_MOUNTAINS_AREA).terrain).toBe('mountains'); });
});

describe('buildings', () => {
  it('defines exactly the 21 agreed building types', () => { expect(Object.keys(BUILDING_TYPES)).toHaveLength(21); });
  it('allows regular buildings on plains and rejects them on forest', () => { const state = createGameState(); const plain = state.tiles.find((t) => t.x >= 35 && t.x <= 45 && t.y >= 45 && t.y <= 55 && t.terrain === 'plains' && t.influence.player === 1); const forest = state.tiles.find((t) => t.terrain === 'forest'); expect(plain).toBeTruthy(); expect(canBuildOnTile(state, BUILDING_TYPES.WAREHOUSE.id, plain.id)).toBe(true); expect(canBuildOnTile(state, BUILDING_TYPES.WAREHOUSE.id, forest.id)).toBe(false); });
  it('allows mines on hills and mountains', () => { const state = createGameState(); const hills = state.tiles.find((t) => t.terrain === 'hills' && t.x >= 43 && t.x <= 44 && t.y >= 54 && t.y <= 55); const mountains = state.tiles.find((t) => t.terrain === 'mountains' && t.x >= 56 && t.x <= 57 && t.y >= 43 && t.y <= 44); expect(canBuildOnTile(state, BUILDING_TYPES.IRON_MINE.id, hills.id)).toBe(true); expect(canBuildOnTile(state, BUILDING_TYPES.IRON_MINE.id, mountains.id)).toBe(true); });
  it('calculates the complete footprint for a building', () => { const state = createGameState(); const plain = state.tiles.find((t) => t.x >= 35 && t.x <= 45 && t.y >= 45 && t.y <= 55 && t.terrain === 'plains' && t.influence.player === 1); expect(plain).toBeTruthy(); expect(getFootprintTiles(state, BUILDING_TYPES.WAREHOUSE.id, plain.id)).toHaveLength(9); });
  it('creates a one-cell reservation around the footprint', () => { const state = createGameState(); const plain = state.tiles.find((t) => t.x >= 35 && t.x <= 45 && t.y >= 45 && t.y <= 55 && t.terrain === 'plains' && t.influence.player === 1); const reserved = getReservedTiles(state, BUILDING_TYPES.WAREHOUSE.id, plain.id); expect(reserved.length).toBeGreaterThan(0); expect(reserved.every((tile) => !getFootprintTiles(state, BUILDING_TYPES.WAREHOUSE.id, plain.id).includes(tile))).toBe(true); });
  it('allows reservation overlap but blocks building placement in reservation', () => { const state = createGameState(); const a = state.tiles.find((t) => t.x >= 35 && t.x <= 45 && t.y >= 45 && t.y <= 55 && t.terrain === 'plains' && t.influence.player === 1); const reserved = getReservedTiles(state, BUILDING_TYPES.WAREHOUSE.id, a.id); expect(reserved.length).toBeGreaterThan(0); expect(isReservedForBuilding({ ...state, buildings: [{ ...state.buildings[0], typeId: BUILDING_TYPES.WAREHOUSE.id, tileId: a.id }] }, reserved[0].id)).toBe(true); });
});

describe('workers and work zones', () => {
  it('uses radius five for work zones', () => { expect(createWorkZone('z', 'player', '50-50').radius).toBe(5); });
  it('rejects an incompatible worker', () => { const state = createGameState(); const worker = createWorker('w', 'player', WORKER_TYPES.LUMBERJACK.id); state.workers.push(worker); expect(() => assignWorkerToBuilding(state, worker.id, state.buildings[0].id)).toThrow(); });
});

describe('territory', () => {
  it('uses the normal influence radius of five', () => { expect(INFLUENCE_RADIUS).toBe(5); expect(isWithinInfluenceRadius({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(true); expect(isWithinInfluenceRadius({ x: 0, y: 0 }, { x: 6, y: 0 })).toBe(false); });
  it('expands from an additional source', () => { const state = createGameState(); const before = getOwnedTiles(state, 'player').length; addTerritorySource(state, createTerritorySource('extra', 'player', '80-80', 1, 5)); expect(getOwnedTiles(state, 'player').length).toBeGreaterThan(before); });
});
