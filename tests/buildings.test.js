import { describe, expect, it } from 'vitest';
import { BUILDING_TYPES, addBuilding, canBuildOnTile, getBuildingAtTile, getBuildingType, getConstructionMaterials, getFootprintTiles, getReservedTiles, isReservedForBuilding, getBuildingFlagPosition } from '../src/game/buildings.js';
import { createGameState } from '../src/game/state.js';
import { BUILD_TIME_PER_PLANK, BUILD_TIME_PER_STONE, CONSTRUCTION_STATES, advanceAllConstructions, advanceConstruction, completeConstruction, getConstructionTime, startConstruction } from '../src/game/construction.js';
import { deliverConstructionMaterialViaLogistics } from './constructionLogisticsHelper.js';

function place(state, id, typeId, tileId = '40-40', terrain = 'plains') {
  const [x, y] = tileId.split('-').map(Number);
  const type = getBuildingType({ typeId });
  for (let dy = 0; dy < type.height; dy += 1) for (let dx = 0; dx < type.width; dx += 1) {
    const tile = state.tiles.find((item) => item.x === x + dx && item.y === y + dy);
    tile.ownerId = state.player.id;
    tile.terrain = terrain;
  }
  return addBuilding(state, id, state.player.id, typeId, tileId);
}
function constructionSetup(typeId, id = 'construction-1', tileId = '40-40') {
  const state = createGameState();
  return { state, building: place(state, id, typeId, tileId) };
}
function deliverUnits(state, building, resourceId, amount) {
  let delivered = 0;
  for (let index = 0; index < amount; index += 1) {
    const count = deliverConstructionMaterialViaLogistics(state, building, resourceId, 1);
    if (count === 0) break;
    delivered += count;
    advanceConstruction(state, building, 0);
    const duration = resourceId === 'planks' ? BUILD_TIME_PER_PLANK : BUILD_TIME_PER_STONE;
    advanceConstruction(state, building, duration);
  }
  return delivered;
}

describe('building catalog and placement', () => {
  it('contains 22 unique building types', () => { expect(Object.keys(BUILDING_TYPES)).toHaveLength(22); expect(new Set(Object.values(BUILDING_TYPES).map((type) => type.id)).size).toBe(22); });
  it('returns defensive construction materials and resolves types', () => { const building = { typeId: 'warehouse' }; const materials = getConstructionMaterials(building); materials.planks = 999; expect(getConstructionMaterials(building)).toEqual({ planks: 3, stone: 3 }); expect(getBuildingType(building).id).toBe('warehouse'); });
  it('keeps agreed geometry, terrain and reservations', () => { const state = createGameState(); expect(getFootprintTiles(state, 'warehouse', '30-30')).toHaveLength(9); expect(getFootprintTiles(state, 'fortress', '95-95')).toHaveLength(25); expect(getFootprintTiles(state, 'fortress', '96-96')).toEqual([]); place(state, 'first', 'stonecutter_hut', '30-30'); expect(getBuildingAtTile(state, '30-30').id).toBe('first'); expect(getReservedTiles(state, 'stonecutter_hut', '30-30')).toHaveLength(12); expect(isReservedForBuilding(state, '29-29')).toBe(true); });
  it('requires ownership and suitable terrain', () => { const state = createGameState(); for (const y of [40, 41]) for (const x of [40, 41]) { const current = state.tiles.find((item) => item.x === x && item.y === y); current.ownerId = 'player'; current.terrain = 'hills'; } expect(canBuildOnTile(state, 'iron_mine', '40-40')).toBe(true); state.tiles.find((item) => item.id === '41-41').terrain = 'plains'; expect(canBuildOnTile(state, 'iron_mine', '40-40')).toBe(false); });
  it('places every building flag at the fixed southern inter-cell node', () => { const state = createGameState(); for (const [typeId, height] of [['stonecutter_hut', 2], ['workshop', 3], ['farm', 4], ['fortress', 5]]) expect(getBuildingFlagPosition(state, { typeId, tileId: '40-40' })).toEqual({ x: 41, y: 40 + height }); });
  it('creates the building and its single flag as one placement operation', () => { const state = createGameState(); const building = place(state, 'warehouse-1', 'warehouse'); expect(state.buildings).toHaveLength(2); expect(state.flags).toHaveLength(2); const flag = state.flags.find((item) => item.id === 'warehouse-1-flag'); expect(flag).toMatchObject({ id: 'warehouse-1-flag', buildingId: 'warehouse-1', x: 41, y: 43 }); expect(building.flagId).toBe(flag.id); });
});

describe('physical construction mechanics', () => {
  it('uses one simulation tick per game second', () => { expect(BUILD_TIME_PER_PLANK).toBe(10); expect(BUILD_TIME_PER_STONE).toBe(15); expect(getConstructionTime({ planks: 3, stone: 2 })).toBe(60); });
  it('requires a construction flag', () => { const { state, building } = constructionSetup('warehouse'); state.flags = []; expect(() => startConstruction(state, building)).toThrow('Construction flag not found'); });
  it('delivers through warehouse → road carrier → construction flag without starting processing', () => { const { state, building } = constructionSetup('stonecutter_hut'); startConstruction(state, building, 1000); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 1)).toBe(1); const flag = state.flags.find((item) => item.buildingId === building.id); expect(flag.cargo.planks).toBe(1); expect(building.constructionMaterialsDelivered.planks).toBe(1); expect(building.constructionMaterialsUsed.planks).toBe(0); expect(building.currentConstructionMaterial).toBe(null); expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL); });
  it('does not over-deliver while a delivered unit is still waiting at the construction flag', () => { const { state, building } = constructionSetup('stonecutter_hut'); startConstruction(state, building); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 1)).toBe(1); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 1)).toBe(0); expect(building.constructionMaterialsDelivered.planks).toBe(1); expect(state.flags.find((flag) => flag.buildingId === building.id).cargo.planks).toBe(1); });
  it('takes one material from the flag and then processes it', () => { const { state, building } = constructionSetup('stonecutter_hut'); startConstruction(state, building); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 1)).toBe(1); advanceConstruction(state, building, 0); expect(state.flags.find((flag) => flag.buildingId === building.id).cargo.planks).toBe(0); expect(building.constructionMaterialsUsed.planks).toBe(1); expect(building.currentConstructionMaterial).toBe('planks'); expect(building.constructionTimer).toBe(10); });
  it('processes each delivered unit only after the builder picks it from the flag', () => { const { state, building } = constructionSetup('stonecutter_hut'); startConstruction(state, building); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 1)).toBe(1); expect(building.currentConstructionMaterial).toBe(null); advanceConstruction(state, building, 0); expect(building.currentConstructionMaterial).toBe('planks'); expect(building.constructionTimer).toBe(10); advanceConstruction(state, building, 10); expect(building.constructionComplete).toBe(false); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 1)).toBe(1); advanceConstruction(state, building, 0); expect(building.currentConstructionMaterial).toBe('planks'); });
  it('pauses when the next required material is missing and resumes after delivery', () => { const { state, building } = constructionSetup('warehouse'); startConstruction(state, building); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 1)).toBe(1); advanceConstruction(state, building, 0); advanceConstruction(state, building, 10); expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL); expect(deliverConstructionMaterialViaLogistics(state, building, 'stone', 1)).toBe(1); advanceConstruction(state, building, 0); expect(building.currentConstructionMaterial).toBe('stone'); });
  it('activates only after every required unit is delivered, picked up and processed', () => { const { state, building } = constructionSetup('warehouse'); startConstruction(state, building); expect(deliverUnits(state, building, 'planks', 3)).toBe(3); expect(deliverUnits(state, building, 'stone', 3)).toBe(3); expect(building.constructionMaterialsDelivered).toEqual({ planks: 3, stone: 3 }); expect(building.constructionMaterialsUsed).toEqual({ planks: 3, stone: 3 }); expect(building.constructionComplete).toBe(true); expect(building.active).toBe(true); expect(building.constructionState).toBe(CONSTRUCTION_STATES.COMPLETED); });
  it('advances multiple constructions independently when each builder processes its own delivered material', () => { const state = createGameState(); const a = place(state, 'a', 'stonecutter_hut', '30-30'); const b = place(state, 'b', 'stonecutter_hut', '40-40'); startConstruction(state, a); startConstruction(state, b); expect(deliverConstructionMaterialViaLogistics(state, a, 'planks', 1)).toBe(1); expect(deliverConstructionMaterialViaLogistics(state, b, 'planks', 1)).toBe(1); advanceAllConstructions(state, 0); expect(a.constructionMaterialsUsed.planks).toBe(1); expect(b.constructionMaterialsUsed.planks).toBe(1); advanceAllConstructions(state, 10); expect(a.constructionComplete).toBe(false); expect(b.constructionComplete).toBe(false); expect(deliverConstructionMaterialViaLogistics(state, a, 'planks', 1)).toBe(1); expect(deliverConstructionMaterialViaLogistics(state, b, 'planks', 1)).toBe(1); advanceAllConstructions(state, 0); advanceAllConstructions(state, 10); expect(a.constructionComplete).toBe(true); expect(b.constructionComplete).toBe(true); });
  it('rejects completion while the current material is still processing', () => { const { state, building } = constructionSetup('stonecutter_hut'); startConstruction(state, building); deliverConstructionMaterialViaLogistics(state, building, 'planks', 1); advanceConstruction(state, building, 0); expect(() => completeConstruction(state, building)).toThrow('Construction materials are not fully processed'); });
  it('completes only fully processed construction and accepts an object or id', () => { const { state, building } = constructionSetup('stonecutter_hut'); startConstruction(state, building); expect(deliverUnits(state, building, 'planks', 2)).toBe(2); expect(building.constructionComplete).toBe(true); expect(completeConstruction(state, building.id)).toBe(building); expect(building.active).toBe(true); });
});
