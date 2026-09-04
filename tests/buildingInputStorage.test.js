import { describe, expect, it } from 'vitest';
import { addInputResourceToBuilding, getBuildingInputStorage, getBuildingInputStorageCapacity } from '../src/game/carriers.js';
import { addBuilding } from '../src/game/buildings.js';
import { createGameState } from '../src/game/state.js';

function place(state, id, typeId, tileId = '40-40') {
  const [x, y] = tileId.split('-').map(Number);
  const type = typeId === 'workshop' ? { width: 3, height: 3 } : { width: 3, height: 3 };
  for (let dy = 0; dy < type.height; dy += 1) for (let dx = 0; dx < type.width; dx += 1) {
    const tile = state.tiles.find((item) => item.x === x + dx && item.y === y + dy);
    tile.ownerId = state.player.id;
    tile.terrain = 'plains';
  }
  return addBuilding(state, id, state.player.id, typeId, tileId);
}

describe('building input storage', () => {
  it('provides exactly five input slots for a building that consumes resources', () => {
    const state = createGameState();
    const building = place(state, 'workshop', 'workshop');
    expect(getBuildingInputStorageCapacity()).toBe(5);
    expect(getBuildingInputStorage(state, building.id)).toHaveLength(5);
    expect(getBuildingInputStorage(state, building.id)).toEqual([null, null, null, null, null]);
  });

  it('accepts any resource requested by the building, but never an unrelated resource or more than five units', () => {
    const state = createGameState();
    const building = place(state, 'workshop', 'workshop');
    expect(addInputResourceToBuilding(state, building.id, 'steel', 2)).toBe(2);
    expect(addInputResourceToBuilding(state, building.id, 'planks', 2)).toBe(2);
    expect(addInputResourceToBuilding(state, building.id, 'wood', 1)).toBe(0);
    expect(addInputResourceToBuilding(state, building.id, 'steel', 2)).toBe(1);
    expect(getBuildingInputStorage(state, building.id)).toEqual(['steel', 'steel', 'planks', 'planks', 'steel']);
  });

  it('does not create restricted input storage for a warehouse', () => {
    const state = createGameState();
    const warehouse = place(state, 'warehouse', 'warehouse');
    expect(warehouse.inputStorageSlots).toBeNull();
    expect(addInputResourceToBuilding(state, warehouse.id, 'steel', 1)).toBe(0);
  });
});
