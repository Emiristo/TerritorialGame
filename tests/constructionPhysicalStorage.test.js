import { describe, expect, it } from 'vitest';
import { BUILDING_TYPES, addBuilding } from '../src/game/buildings.js';
import { createGameState } from '../src/game/state.js';
import { BUILD_TIME_PER_PLANK, BUILD_TIME_PER_STONE, CONSTRUCTION_STATES, startConstruction, advanceConstruction } from '../src/game/construction.js';
import { deliverConstructionMaterialViaLogistics } from './constructionLogisticsHelper.js';

function makeBuilding(typeId = BUILDING_TYPES.WAREHOUSE.id, id = 'construction-1', tileId = '40-40') {
  const state = createGameState();
  const [x, y] = tileId.split('-').map(Number);
  const type = BUILDING_TYPES[Object.keys(BUILDING_TYPES).find((key) => BUILDING_TYPES[key].id === typeId)];
  for (let dy = 0; dy < type.height; dy += 1) for (let dx = 0; dx < type.width; dx += 1) {
    const tile = state.tiles.find((item) => item.x === x + dx && item.y === y + dy);
    tile.ownerId = state.player.id;
    tile.terrain = 'plains';
  }
  const building = addBuilding(state, id, state.player.id, typeId, tileId);
  return { state, building };
}
function constructionFlag(state, building) {
  return state.flags.find((flag) => flag.buildingId === building.id);
}

describe('physical construction site storage', () => {
  it('uses one simulation tick per game second for material processing', () => { expect(BUILD_TIME_PER_PLANK).toBe(10); expect(BUILD_TIME_PER_STONE).toBe(15); });
  it('uses the common flag cargo as construction-site storage without starting processing', () => { const { state, building } = makeBuilding(BUILDING_TYPES.STONECUTTER_HUT.id); startConstruction(state, building, 1000); expect(building.constructionState).toBe(CONSTRUCTION_STATES.PLACED); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 1)).toBe(1); expect(constructionFlag(state, building).cargo.planks).toBe(1); expect(building.constructionMaterialsDelivered.planks).toBe(1); expect(building.constructionMaterialsUsed.planks).toBe(0); expect(building.currentConstructionMaterial).toBe(null); });
  it('builder takes exactly one material from the flag and then processes it', () => { const { state, building } = makeBuilding(BUILDING_TYPES.STONECUTTER_HUT.id); startConstruction(state, building); deliverConstructionMaterialViaLogistics(state, building, 'planks', 1); advanceConstruction(state, building, 0); expect(constructionFlag(state, building).cargo.planks).toBe(0); expect(building.constructionMaterialsUsed.planks).toBe(1); expect(building.currentConstructionMaterial).toBe('planks'); expect(building.constructionTimer).toBe(10); expect(building.constructionComplete).toBe(false); });
  it('accumulates several delivered materials at the flag while the builder processes one', () => { const { state, building } = makeBuilding(); startConstruction(state, building); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 2)).toBe(2); expect(deliverConstructionMaterialViaLogistics(state, building, 'stone', 1)).toBe(1); expect(constructionFlag(state, building).cargo.planks).toBe(2); expect(constructionFlag(state, building).cargo.stone).toBe(1); advanceConstruction(state, building, 10); expect(building.currentConstructionMaterial).toBe('planks'); advanceConstruction(state, building, 10); expect(building.currentConstructionMaterial).toBe('stone'); });
  it('processes materials strictly in delivery order, regardless of resource type', () => { const { state, building } = makeBuilding(); startConstruction(state, building); expect(deliverConstructionMaterialViaLogistics(state, building, 'stone', 1)).toBe(1); expect(deliverConstructionMaterialViaLogistics(state, building, 'planks', 1)).toBe(1); expect(constructionFlag(state, building).cargo.stone).toBe(1); expect(constructionFlag(state, building).cargo.planks).toBe(1); advanceConstruction(state, building, 0); expect(building.currentConstructionMaterial).toBe('stone'); expect(constructionFlag(state, building).cargo.stone).toBe(0); expect(constructionFlag(state, building).cargo.planks).toBe(1); advanceConstruction(state, building, BUILD_TIME_PER_STONE); expect(building.currentConstructionMaterial).toBe('planks'); expect(constructionFlag(state, building).cargo.planks).toBe(0); });
  it('pauses after finishing a material when the next required material is not at the flag', () => { const { state, building } = makeBuilding(); startConstruction(state, building); deliverConstructionMaterialViaLogistics(state, building, 'planks', 1); advanceConstruction(state, building, 10); expect(building.currentConstructionMaterial).toBe(null); expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL); expect(building.constructionComplete).toBe(false); });
  it('resumes only after the missing material is delivered to the flag', () => { const { state, building } = makeBuilding(); startConstruction(state, building); deliverConstructionMaterialViaLogistics(state, building, 'planks', 1); advanceConstruction(state, building, 10); expect(deliverConstructionMaterialViaLogistics(state, building, 'stone', 1)).toBe(1); advanceConstruction(state, building, 0); expect(building.currentConstructionMaterial).toBe('stone'); expect(building.constructionTimer).toBe(15); });
});
