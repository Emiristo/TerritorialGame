import { describe, expect, it } from 'vitest';
import { createGameState, MAP_WIDTH, MAP_HEIGHT, STARTER_FOREST_AREA, STARTER_STONE_AREA, STARTER_HILLS_AREA, STARTER_MOUNTAINS_AREA } from '../src/game/state.js';
import { BUILDING_TYPES, addBuilding, canBuildOnTile, getFootprintTiles, getReservedTiles, isReservedForBuilding } from '../src/game/buildings.js';
import { createGameClock, startGameClock, tickGameClock } from '../src/game/clock.js';
import { BUILD_TIME_PER_PLANK, BUILD_TIME_PER_STONE, CONSTRUCTION_STATES, startConstruction, advanceConstruction } from '../src/game/construction.js';
import { isWithinInfluenceRadius } from '../src/game/influence.js';
import { WORKER_TYPES, createWorker, createWorkZone, assignWorkerToBuilding, workWorker } from '../src/game/workers.js';
import { createTerritorySource, addTerritorySource, getOwnedTiles } from '../src/game/territory.js';
import { deliverConstructionMaterialViaLogistics } from './constructionLogisticsHelper.js';

function place(state, id, typeId, tileId = '40-40') {
  const [x, y] = tileId.split('-').map(Number);
  const type = Object.values(BUILDING_TYPES).find((item) => item.id === typeId);
  for (let dy = 0; dy < type.height; dy += 1) for (let dx = 0; dx < type.width; dx += 1) {
    const tile = state.tiles.find((item) => item.x === x + dx && item.y === y + dy);
    tile.ownerId = state.player.id;
    tile.terrain = 'plains';
  }
  return addBuilding(state, id, state.player.id, typeId, tileId);
}
function deliverUnits(state, building, resourceId, amount) {
  let delivered = 0;
  for (let index = 0; index < amount; index += 1) delivered += deliverConstructionMaterialViaLogistics(state, building, resourceId, 1);
  return delivered;
}

describe('game clock', () => { it('starts at zero and advances by whole simulation ticks', () => { const clock = createGameClock(); expect(clock.elapsedSeconds).toBe(0); expect(clock.simulationTicks).toBe(0); startGameClock(clock, 1000); expect(tickGameClock(clock, 3500)).toBe(2); expect(clock.elapsedSeconds).toBe(2); expect(clock.realTimeAccumulator).toBe(0.5); }); });

describe('construction time and material delivery', () => {
  it('keeps the material work rates at 10 seconds per plank and 15 seconds per stone', () => { expect(BUILD_TIME_PER_PLANK).toBe(10); expect(BUILD_TIME_PER_STONE).toBe(15); });
  it('has no aggregate remaining construction time field', () => { const state = createGameState(); const building = place(state, 'warehouse-1', 'warehouse'); expect(building).not.toHaveProperty('remainingConstructionTime'); expect(building).not.toHaveProperty('constructionTime'); });
  it('starts in PLACED and then moves to WAITING_FOR_MATERIAL', () => { const state = createGameState(); const building = place(state, 'stonecutter-1', 'stonecutter_hut'); startConstruction(state, building, 5000); expect(building.constructionState).toBe(CONSTRUCTION_STATES.PLACED); advanceConstruction(state, building, 0); expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL); });
  it('follows construction states through physical deliveries and builder processing', () => { const state = createGameState(); const building = place(state, 'warehouse-1', 'warehouse'); startConstruction(state, building); advanceConstruction(state, building, 0); expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL); expect(deliverUnits(state, building, 'planks', 3)).toBe(3); advanceConstruction(state, building, 30); expect(building.constructionMaterialsUsed.planks).toBe(3); expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL); expect(deliverUnits(state, building, 'stone', 3)).toBe(3); advanceConstruction(state, building, 45); expect(building.constructionState).toBe(CONSTRUCTION_STATES.COMPLETED); expect(building.constructionComplete).toBe(true); });
  it('starts one 10-second segment after the builder takes a plank from the flag', () => { const state = createGameState(); const building = place(state, 'stonecutter-1', 'stonecutter_hut'); startConstruction(state, building); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 1)).toBe(1); expect(state.flags.find((flag) => flag.buildingId === building.id).cargo.planks).toBe(1); advanceConstruction(state, building, 0); expect(building.currentConstructionMaterial).toBe('planks'); expect(building.constructionTimer).toBe(10); advanceConstruction(state, building, 9); expect(building.constructionTimer).toBe(1); advanceConstruction(state, building, 1); expect(building.currentConstructionMaterial).toBe(null); });
  it('waits when the next material has not reached the construction flag', () => { const state = createGameState(); const building = place(state, 'stonecutter-1', 'stonecutter_hut'); startConstruction(state, building); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 1)).toBe(1); advanceConstruction(state, building, 10); expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL); expect(building.constructionComplete).toBe(false); });
  it('processes materials in the order they reached the construction flag', () => { const state = createGameState(); const building = place(state, 'warehouse-1', 'warehouse'); startConstruction(state, building); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 1)).toBe(1); expect(deliverConstructionMaterialViaLogistics(state, building, 'stone', 1)).toBe(1); expect(building.currentConstructionMaterial).toBe(null); advanceConstruction(state, building, 0); expect(building.currentConstructionMaterial).toBe('planks'); advanceConstruction(state, building, 10); expect(building.currentConstructionMaterial).toBe('stone'); expect(building.constructionTimer).toBe(15); });
  it('does not exceed required material even when more stock is requested', () => { const state = createGameState(); const building = place(state, 'stonecutter-1', 'stonecutter_hut'); startConstruction(state, building); expect(deliverUnits(state, building, 'planks', 2)).toBe(2); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 1)).toBe(0); expect(building.constructionMaterialsDelivered.planks).toBe(2); });
  it('allows two buildings to advance independently', () => { const state = createGameState(); const a = place(state, 'a', 'stonecutter_hut', '40-40'); const b = place(state, 'b', 'stonecutter_hut', '60-60'); startConstruction(state, a); startConstruction(state, b); expect(deliverUnits(state, a, 'planks', 2)).toBe(2); expect(deliverUnits(state, b, 'planks', 2)).toBe(2); advanceConstruction(state, a, 20); advanceConstruction(state, b, 20); expect(a.constructionComplete).toBe(true); expect(b.constructionComplete).toBe(true); });
  it('does not move a construction timer backwards or below zero', () => { const state = createGameState(); const building = place(state, 'stonecutter-1', 'stonecutter_hut'); startConstruction(state, building); expect(deliverUnits(state, building, 'planks', 2)).toBe(2); advanceConstruction(state, building, 0); expect(building.constructionTimer).toBe(10); advanceConstruction(state, building, -5); expect(building.constructionTimer).toBe(10); advanceConstruction(state, building, 20); expect(building.constructionComplete).toBe(true); });
  it('starts construction with a timestamp without coupling the timer to the game clock', () => { const state = createGameState(); const building = place(state, 'stonecutter-1', 'stonecutter_hut'); startConstruction(state, building, 5000); expect(building.constructionStartedAt).toBe(5000); expect(building.constructionState).toBe(CONSTRUCTION_STATES.PLACED); });
});

describe('territorial influence radii', () => {
  it('stores fixed integer influence radii on headquarters and military buildings', () => {
    expect(BUILDING_TYPES.HEADQUARTERS.influenceRadius).toBe(10);
    expect(BUILDING_TYPES.OUTPOST.influenceRadius).toBe(18);
    expect(BUILDING_TYPES.BARRACKS.influenceRadius).toBe(20);
    expect(BUILDING_TYPES.WATCHTOWER.influenceRadius).toBe(23);
    expect(BUILDING_TYPES.FORTRESS.influenceRadius).toBe(25);
    for (const type of [BUILDING_TYPES.HEADQUARTERS, BUILDING_TYPES.OUTPOST, BUILDING_TYPES.BARRACKS, BUILDING_TYPES.WATCHTOWER, BUILDING_TYPES.FORTRESS]) expect(Number.isInteger(type.influenceRadius)).toBe(true);
  });
  it('requires an explicit radius for every territory influence source', () => {
    expect(() => createTerritorySource('test-source', 'player', '50-50')).toThrow('Territory source radius is required');
  });
  it('uses the radius stored by the territory source', () => {
    const source = createTerritorySource('test-source', 'player', '50-50', 1, BUILDING_TYPES.FORTRESS.influenceRadius);
    expect(source.radius).toBe(25);
    expect(isWithinInfluenceRadius({ x: 50, y: 50 }, { x: 75, y: 50 }, source.radius)).toBe(true);
    expect(isWithinInfluenceRadius({ x: 50, y: 50 }, { x: 76, y: 50 }, source.radius)).toBe(false);
  });
});

void MAP_WIDTH; void MAP_HEIGHT; void STARTER_FOREST_AREA; void STARTER_STONE_AREA; void STARTER_HILLS_AREA; void STARTER_MOUNTAINS_AREA; void isWithinInfluenceRadius; void WORKER_TYPES; void createWorker; void createWorkZone; void assignWorkerToBuilding; void workWorker; void createTerritorySource; void addTerritorySource; void getOwnedTiles; void getReservedTiles; void isReservedForBuilding; void canBuildOnTile;
