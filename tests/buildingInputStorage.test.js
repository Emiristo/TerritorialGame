import { describe, expect, it } from 'vitest';
import { addInputResourceToBuilding, addProductionOutputToBuilding, getBuildingInputStorage, getBuildingInputStorageCapacity, getBuildingOutputStorageResource, removeProductionOutputFromBuilding } from '../src/game/carriers.js';
import { addBuilding } from '../src/game/buildings.js';
import { createGameState } from '../src/game/state.js';

function place(state, id, typeId, tileId = '40-40') {
  const [x, y] = tileId.split('-').map(Number);
  const type = { width: 3, height: 3 };
  for (let dy = 0; dy < type.height; dy += 1) for (let dx = 0; dx < type.width; dx += 1) {
    const tile = state.tiles.find((item) => item.x === x + dx && item.y === y + dy);
    tile.ownerId = state.player.id;
    tile.terrain = 'plains';
  }
  return addBuilding(state, id, state.player.id, typeId, tileId);
}

describe('building input storage', () => {
  it('provides exactly four input slots plus one reserved output slot for a production building', () => {
    const state = createGameState();
    const building = place(state, 'workshop', 'workshop');
    expect(getBuildingInputStorageCapacity()).toBe(4);
    expect(getBuildingInputStorage(state, building.id)).toHaveLength(4);
    expect(getBuildingInputStorage(state, building.id)).toEqual([null, null, null, null]);
    expect(building.outputStorageSlot).toBeNull();
  });

  it('accepts requested resources only into the four input slots and never into the reserved output slot', () => {
    const state = createGameState();
    const building = place(state, 'workshop', 'workshop');
    expect(addInputResourceToBuilding(state, building.id, 'steel', 2)).toBe(2);
    expect(addInputResourceToBuilding(state, building.id, 'planks', 2)).toBe(2);
    expect(addInputResourceToBuilding(state, building.id, 'wood', 1)).toBe(0);
    expect(addInputResourceToBuilding(state, building.id, 'steel', 2)).toBe(0);
    expect(getBuildingInputStorage(state, building.id)).toEqual(['steel', 'steel', 'planks', 'planks']);
    expect(building.outputStorageSlot).toBeNull();
  });

  it('keeps the fifth slot reserved exclusively for finished production', () => {
    const state = createGameState();
    const building = place(state, 'workshop', 'workshop');
    expect(addProductionOutputToBuilding(state, building.id, 'tool', 1)).toBe(1);
    expect(getBuildingOutputStorageResource(state, building.id)).toBe('tool');
    expect(addProductionOutputToBuilding(state, building.id, 'tool', 1)).toBe(0);
    expect(addInputResourceToBuilding(state, building.id, 'steel', 1)).toBe(1);
    expect(getBuildingInputStorage(state, building.id)).toEqual(['steel', null, null, null]);
    expect(removeProductionOutputFromBuilding(state, building.id, 'tool', 1)).toBe(1);
    expect(getBuildingOutputStorageResource(state, building.id)).toBeNull();
  });

  it('does not create restricted production storage for a warehouse', () => {
    const state = createGameState();
    const warehouse = place(state, 'warehouse', 'warehouse');
    expect(warehouse.inputStorageSlots).toBeNull();
    expect(warehouse.outputStorageSlot).toBeUndefined();
    expect(addInputResourceToBuilding(state, warehouse.id, 'steel', 1)).toBe(0);
  });
});
