import { describe, expect, it } from 'vitest';
import { BUILDING_TYPES, addBuilding } from '../src/game/buildings.js';
import { createGameState } from '../src/game/state.js';
import { getWorldTile } from '../src/game/world/worldMap.js';
import { createWorker, WORKER_TYPES } from '../src/game/workers.js';
import { assignConstructionWorker, advanceConstruction, completeConstruction, startConstruction } from '../src/game/construction.js';

function setup(typeId = BUILDING_TYPES.STONECUTTER_HUT.id) {
  const state = createGameState();
  const type = Object.values(BUILDING_TYPES).find((item) => item.id === typeId);
  for (let dy = 0; dy < type.height; dy += 1) for (let dx = 0; dx < type.width; dx += 1) {
    const tile = getWorldTile(state.worldMap, 40 + dx, 40 + dy);
    tile.ownerId = state.player.id;
    tile.terrain = 'plains';
  }
  const building = addBuilding(state, 'construction-1', state.player.id, typeId, '40-40');
  const builder = createWorker('builder-1', state.player.id, WORKER_TYPES.BUILDER.id);
  state.workers.push(builder);
  return { state, building, builder };
}

describe('construction worker lifecycle', () => {
  it('requires a builder before material processing can begin', () => {
    const { state, building } = setup();
    startConstruction(state, building);
    building.constructionMaterialQueue.push('planks');
    building.constructionMaterialsDelivered.planks = 1;
    advanceConstruction(state, building, 0);
    expect(building.currentConstructionMaterial).toBe(null);
    expect(building.constructionState).toBe('WAITING_FOR_MATERIAL');
  });

  it('accepts only an owned builder and binds both sides of the assignment', () => {
    const { state, building, builder } = setup();
    expect(assignConstructionWorker(state, building, builder)).toBe(true);
    expect(building.constructionWorkerId).toBe(builder.id);
    expect(builder.constructionBuildingId).toBe(building.id);
    expect(builder.state).toBe('working');
  });

  it('rejects a non-builder or another owner', () => {
    const { state, building } = setup();
    const worker = createWorker('worker-1', state.player.id, WORKER_TYPES.MINER.id);
    const foreignBuilder = createWorker('foreign-builder', 'other-player', WORKER_TYPES.BUILDER.id);
    state.workers.push(worker, foreignBuilder);
    expect(assignConstructionWorker(state, building, worker)).toBe(false);
    expect(assignConstructionWorker(state, building, foreignBuilder)).toBe(false);
    expect(building.constructionWorkerId).toBe(null);
  });

  it('does not allow one builder to be assigned to two construction sites', () => {
    const { state, building, builder } = setup();
    const type = BUILDING_TYPES.STONECUTTER_HUT;
    for (let dy = 0; dy < type.height; dy += 1) for (let dx = 0; dx < type.width; dx += 1) {
      const tile = getWorldTile(state.worldMap, 60 + dx, 60 + dy);
      tile.ownerId = state.player.id;
      tile.terrain = 'plains';
    }
    const second = addBuilding(state, 'construction-2', state.player.id, type.id, '60-60');
    expect(assignConstructionWorker(state, building, builder)).toBe(true);
    expect(assignConstructionWorker(state, second, builder)).toBe(false);
    expect(second.constructionWorkerId).toBe(null);
  });

  it('preserves an assigned builder when construction starts', () => {
    const { state, building, builder } = setup();
    expect(assignConstructionWorker(state, building, builder)).toBe(true);
    startConstruction(state, building);
    expect(building.constructionWorkerId).toBe(builder.id);
    expect(builder.constructionBuildingId).toBe(building.id);
  });

  it('releases the builder when construction completes', () => {
    const { state, building, builder } = setup();
    expect(assignConstructionWorker(state, building, builder)).toBe(true);
    startConstruction(state, building);
    building.constructionMaterialsDelivered.planks = 2;
    building.constructionMaterialsUsed.planks = 2;
    building.constructionMaterialQueue = [];
    completeConstruction(state, building);
    expect(building.constructionComplete).toBe(true);
    expect(building.constructionWorkerId).toBe(null);
    expect(builder.constructionBuildingId).toBe(null);
    expect(builder.state).toBe('idle');
  });
});
