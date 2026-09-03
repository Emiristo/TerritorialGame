import { describe, expect, it } from 'vitest';
import { BUILDING_TYPES, createBuilding } from '../src/game/buildings.js';
import { BUILD_TIME_PER_PLANK, BUILD_TIME_PER_STONE, CONSTRUCTION_STATES, startConstruction, deliverMaterialToConstructionFlag, advanceConstruction } from '../src/game/construction.js';

function makeState(building) {
  return {
    tiles: [],
    buildings: [building],
    flags: [{ id: building.flagId, buildingId: building.id, ownerId: building.ownerId, x: 40, y: 42, constructionStorage: {} }]
  };
}

function makeBuilding(typeId = BUILDING_TYPES.WAREHOUSE.id) {
  const building = createBuilding('construction-1', 'player', typeId, '40-40');
  building.flagId = 'construction-1-flag';
  return building;
}

describe('physical construction site storage', () => {
  it('uses one simulation tick per game second for material processing', () => {
    expect(BUILD_TIME_PER_PLANK).toBe(10);
    expect(BUILD_TIME_PER_STONE).toBe(15);
  });

  it('delivery stores material at the construction flag and does not start processing', () => {
    const building = makeBuilding(BUILDING_TYPES.STONECUTTER_HUT.id);
    const state = makeState(building);
    startConstruction(state, building, 1000);

    expect(building.constructionState).toBe(CONSTRUCTION_STATES.PLACED);
    expect(deliverMaterialToConstructionFlag(state, building, 'planks', 1)).toBe(1);
    expect(state.flags[0].constructionStorage.planks).toBe(1);
    expect(building.constructionMaterialsDelivered.planks).toBe(1);
    expect(building.constructionMaterialsUsed.planks).toBe(0);
    expect(building.currentConstructionMaterial).toBe(null);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL);
  });

  it('builder takes exactly one material from the flag and then processes it', () => {
    const building = makeBuilding(BUILDING_TYPES.STONECUTTER_HUT.id);
    const state = makeState(building);
    startConstruction(state, building);
    deliverMaterialToConstructionFlag(state, building, 'planks', 1);

    advanceConstruction(state, building, 0);

    expect(state.flags[0].constructionStorage.planks).toBe(0);
    expect(building.constructionMaterialsUsed.planks).toBe(1);
    expect(building.currentConstructionMaterial).toBe('planks');
    expect(building.constructionTimer).toBe(10);
    expect(building.constructionComplete).toBe(false);
  });

  it('accumulates several delivered materials at the flag while the builder processes one', () => {
    const building = makeBuilding(BUILDING_TYPES.WAREHOUSE.id);
    const state = makeState(building);
    startConstruction(state, building);
    deliverMaterialToConstructionFlag(state, building, 'planks', 2);
    deliverMaterialToConstructionFlag(state, building, 'stone', 1);

    expect(state.flags[0].constructionStorage).toEqual({ planks: 2, stone: 1 });
    expect(building.currentConstructionMaterial).toBe(null);

    advanceConstruction(state, building, 10);
    expect(building.currentConstructionMaterial).toBe('planks');
    expect(building.constructionTimer).toBe(10);
    expect(state.flags[0].constructionStorage.planks).toBe(1);
    expect(state.flags[0].constructionStorage.stone).toBe(1);

    advanceConstruction(state, building, 10);
    expect(building.currentConstructionMaterial).toBe('stone');
    expect(building.constructionTimer).toBe(15);
    expect(state.flags[0].constructionStorage).toEqual({ planks: 0, stone: 1 });
  });

  it('pauses after finishing a material when the next required material is not at the flag', () => {
    const building = makeBuilding(BUILDING_TYPES.WAREHOUSE.id);
    const state = makeState(building);
    startConstruction(state, building);
    deliverMaterialToConstructionFlag(state, building, 'planks', 1);

    advanceConstruction(state, building, 10);

    expect(building.currentConstructionMaterial).toBe(null);
    expect(building.constructionTimer).toBe(0);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL);
    expect(building.constructionComplete).toBe(false);
    expect(building.constructionMaterialsUsed).toEqual({ planks: 1, stone: 0 });
  });

  it('resumes only after the missing material is delivered to the flag', () => {
    const building = makeBuilding(BUILDING_TYPES.WAREHOUSE.id);
    const state = makeState(building);
    startConstruction(state, building);
    deliverMaterialToConstructionFlag(state, building, 'planks', 1);
    advanceConstruction(state, building, 10);

    expect(deliverMaterialToConstructionFlag(state, building, 'stone', 1)).toBe(1);
    expect(building.currentConstructionMaterial).toBe(null);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL);

    advanceConstruction(state, building, 0);
    expect(building.currentConstructionMaterial).toBe('stone');
    expect(building.constructionTimer).toBe(15);

    advanceConstruction(state, building, 15);
    expect(building.constructionComplete).toBe(false);
  });
});
