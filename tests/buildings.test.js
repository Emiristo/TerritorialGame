import { describe, expect, it } from 'vitest';
import { BUILDING_TYPES, addBuilding, canBuildOnTile, createBuilding, getBuildingAtTile, getBuildingType, getConstructionMaterials, getFootprintTiles, getReservedTiles, isReservedForBuilding } from '../src/game/buildings.js';
import { createGameState } from '../src/game/state.js';
import { BUILD_TIME_PER_PLANK, BUILD_TIME_PER_STONE, CONSTRUCTION_STATES, advanceAllConstructions, advanceConstruction, completeConstruction, getConstructionTime, startConstruction } from '../src/game/construction.js';
import { deliverConstructionMaterial } from '../src/game/materials.js';

const tile = (state, x, y) => state.tiles.find((item) => item.x === x && item.y === y);
function prepareArea(state, x, y, width, height, ownerId = 'player', terrain = 'plains') {
  for (let dy = 0; dy < height; dy += 1) for (let dx = 0; dx < width; dx += 1) {
    const current = tile(state, x + dx, y + dy);
    current.ownerId = ownerId;
    current.terrain = terrain;
  }
}
function constructionState(building) {
  return { tiles: [], buildings: [building], flags: [{ id: building.flagId, buildingId: building.id, ownerId: building.ownerId, x: 40, y: 42, constructionStorage: {} }] };
}
function constructionBuilding(typeId) {
  const building = createBuilding('construction-1', 'player', typeId, '40-40');
  building.flagId = 'construction-1-flag';
  return building;
}

describe('building catalog and placement', () => {
  it('contains 22 unique building types', () => {
    expect(Object.keys(BUILDING_TYPES)).toHaveLength(22);
    expect(new Set(Object.values(BUILDING_TYPES).map((type) => type.id)).size).toBe(22);
  });
  it('returns defensive construction materials and resolves types', () => {
    const building = createBuilding('warehouse-1', 'player', 'warehouse', '30-30');
    const materials = getConstructionMaterials(building);
    materials.planks = 999;
    expect(getConstructionMaterials(building)).toEqual({ planks: 3, stone: 3 });
    expect(getBuildingType(building).id).toBe('warehouse');
  });
  it('keeps agreed geometry, terrain and reservations', () => {
    const state = createGameState();
    expect(getFootprintTiles(state, 'warehouse', '30-30')).toHaveLength(9);
    expect(getFootprintTiles(state, 'fortress', '95-95')).toHaveLength(25);
    expect(getFootprintTiles(state, 'fortress', '96-96')).toEqual([]);
    prepareArea(state, 30, 30, 2, 2);
    addBuilding(state, createBuilding('first', 'player', 'stonecutter_hut', '30-30'));
    expect(getBuildingAtTile(state, '30-30').id).toBe('first');
    expect(getReservedTiles(state, 'stonecutter_hut', '30-30')).toHaveLength(12);
    expect(isReservedForBuilding(state, '29-29')).toBe(true);
  });
  it('requires ownership and suitable terrain', () => {
    const state = createGameState();
    prepareArea(state, 40, 40, 2, 2, 'player', 'hills');
    expect(canBuildOnTile(state, 'iron_mine', '40-40')).toBe(true);
    tile(state, 41, 41).terrain = 'plains';
    expect(canBuildOnTile(state, 'iron_mine', '40-40')).toBe(false);
  });
});

describe('physical construction mechanics', () => {
  it('uses one simulation tick per game second', () => {
    expect(BUILD_TIME_PER_PLANK).toBe(10);
    expect(BUILD_TIME_PER_STONE).toBe(15);
    expect(getConstructionTime({ planks: 3, stone: 2 })).toBe(60);
  });
  it('requires a construction flag', () => {
    const building = createBuilding('warehouse-1', 'player', 'warehouse', '30-30');
    expect(() => startConstruction({ buildings: [building], flags: [] }, building)).toThrow('Construction flag not found');
  });
  it('delivers to the flag without starting processing', () => {
    const building = constructionBuilding('stonecutter_hut');
    const state = constructionState(building);
    startConstruction(state, building, 1000);
    expect(deliverConstructionMaterial(state, building.id, 'planks', 1)).toBe(1);
    expect(state.flags[0].constructionStorage.planks).toBe(1);
    expect(building.constructionMaterialsDelivered.planks).toBe(1);
    expect(building.constructionMaterialsUsed.planks).toBe(0);
    expect(building.currentConstructionMaterial).toBe(null);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL);
  });
  it('takes one material from the flag and then processes it', () => {
    const building = constructionBuilding('stonecutter_hut');
    const state = constructionState(building);
    startConstruction(state, building);
    deliverConstructionMaterial(state, building.id, 'planks', 1);
    advanceConstruction(state, building, 0);
    expect(state.flags[0].constructionStorage.planks).toBe(0);
    expect(building.constructionMaterialsUsed.planks).toBe(1);
    expect(building.currentConstructionMaterial).toBe('planks');
    expect(building.constructionTimer).toBe(10);
  });
  it('accumulates materials at the flag and processes them sequentially', () => {
    const building = constructionBuilding('warehouse');
    const state = constructionState(building);
    startConstruction(state, building);
    deliverConstructionMaterial(state, building.id, 'planks', 2);
    deliverConstructionMaterial(state, building.id, 'stone', 1);
    advanceConstruction(state, building, 10);
    expect(state.flags[0].constructionStorage).toEqual({ planks: 1, stone: 1 });
    expect(building.currentConstructionMaterial).toBe('planks');
    advanceConstruction(state, building, 10);
    expect(building.currentConstructionMaterial).toBe('stone');
    expect(state.flags[0].constructionStorage).toEqual({ planks: 0, stone: 1 });
  });
  it('pauses when the next required material is missing and resumes after delivery', () => {
    const building = constructionBuilding('warehouse');
    const state = constructionState(building);
    startConstruction(state, building);
    deliverConstructionMaterial(state, building.id, 'planks', 1);
    advanceConstruction(state, building, 10);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL);
    expect(building.constructionComplete).toBe(false);
    deliverConstructionMaterial(state, building.id, 'stone', 1);
    advanceConstruction(state, building, 0);
    expect(building.currentConstructionMaterial).toBe('stone');
    expect(building.constructionTimer).toBe(15);
  });
  it('activates only after every required unit is processed', () => {
    const building = constructionBuilding('warehouse');
    const state = constructionState(building);
    startConstruction(state, building);
    deliverConstructionMaterial(state, building.id, 'planks', 3);
    deliverConstructionMaterial(state, building.id, 'stone', 3);
    advanceConstruction(state, building, 30);
    expect(building.constructionComplete).toBe(false);
    advanceConstruction(state, building, 45);
    expect(building.constructionComplete).toBe(true);
    expect(building.active).toBe(true);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.COMPLETED);
  });
  it('advances multiple constructions independently', () => {
    const state = createGameState();
    prepareArea(state, 30, 30, 2, 2);
    prepareArea(state, 40, 40, 2, 2);
    const a = createBuilding('a', 'player', 'stonecutter_hut', '30-30');
    const b = createBuilding('b', 'player', 'stonecutter_hut', '40-40');
    addBuilding(state, a); addBuilding(state, b);
    startConstruction(state, a); startConstruction(state, b);
    state.player.resources.planks = 4;
    deliverConstructionMaterial(state, a.id, 'planks', 2);
    deliverConstructionMaterial(state, b.id, 'planks', 2);
    advanceAllConstructions(state, 5);
    expect(a.constructionTimer).toBe(5);
    expect(b.constructionTimer).toBe(5);
  });
  it('rejects completion while the current material is still processing', () => {
    const building = constructionBuilding('warehouse');
    const state = constructionState(building);
    building.constructionMaterialsUsed = { planks: 3, stone: 3 };
    building.currentConstructionMaterial = 'stone';
    building.currentConstructionMaterialRemainingTime = 15;
    expect(() => completeConstruction(state, building.id)).toThrow('materials are not fully processed');
  });
  it('completes only fully processed construction', () => {
    const building = constructionBuilding('warehouse');
    const state = constructionState(building);
    building.constructionMaterialsUsed = { planks: 3, stone: 3 };
    completeConstruction(state, building.id, 2000);
    expect(building.constructionComplete).toBe(true);
    expect(building.active).toBe(true);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.COMPLETED);
    expect(building.lastConstructionUpdateAt).toBe(2000);
  });
});
