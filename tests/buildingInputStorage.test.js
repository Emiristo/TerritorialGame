import { describe, expect, it } from 'vitest';
import {
  addInputResourceToBuilding,
  getBuildingInputStorage,
  getBuildingInputStorageCapacity,
} from '../src/game/carriers.js';
import { createBuilding } from '../src/game/buildings.js';

function makeState() {
  return {
    player: { id: 'player' },
    tiles: [],
    buildings: [],
    buildingTypes: [
      { id: 'workshop', input: { steel: 1, planks: 1 } },
      { id: 'warehouse', input: {} },
    ],
  };
}

describe('building input storage', () => {
  it('provides exactly five input slots for a building that consumes resources', () => {
    const state = makeState();
    const building = createBuilding('workshop', 'player', 'workshop', '0-0');
    state.buildings.push(building);

    expect(getBuildingInputStorageCapacity()).toBe(5);
    expect(getBuildingInputStorage(state, building.id)).toHaveLength(5);
    expect(getBuildingInputStorage(state, building.id)).toEqual([null, null, null, null, null]);
  });

  it('accepts only resources requested by the building and never exceeds five units', () => {
    const state = makeState();
    const building = createBuilding('workshop', 'player', 'workshop', '0-0');
    state.buildings.push(building);

    expect(addInputResourceToBuilding(state, building.id, 'steel', 5)).toBe(5);
    expect(addInputResourceToBuilding(state, building.id, 'wood', 1)).toBe(0);
    expect(addInputResourceToBuilding(state, building.id, 'steel', 1)).toBe(0);
    expect(getBuildingInputStorage(state, building.id)).toEqual(['steel', 'steel', 'steel', 'steel', 'steel']);
  });

  it('does not create restricted input storage for a warehouse', () => {
    const state = makeState();
    const warehouse = createBuilding('warehouse', 'player', 'warehouse', '0-0');
    state.buildings.push(warehouse);

    expect(warehouse.inputStorageSlots).toBeNull();
    expect(addInputResourceToBuilding(state, warehouse.id, 'steel', 1)).toBe(0);
  });
});
