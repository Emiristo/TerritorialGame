import { describe, expect, it } from 'vitest';
import { addInputResourceToBuilding, addProductionOutputToBuilding, getBuildingInputStorage, getBuildingInputStorageCapacity, getBuildingOutputStorageResource, removeProductionOutputFromBuilding } from '../src/game/carriers.js';
import { addBuilding } from '../src/game/buildings.js';
import { createGameState } from '../src/game/state.js';
import { getWorldTile } from '../src/game/world/worldMap.js';
import { getFreeInputSlotCount, getInputSlotReservations, getReservedInputSlotCount, occupyReservedInputSlot, releaseBuildingInputSlot, reserveBuildingInputSlot } from '../src/game/inputReservations.js';

function place(state, id, typeId, tileId = '40-40') {
  const [x, y] = tileId.split('-').map(Number);
  const type = { width: 3, height: 3 };
  for (let dy = 0; dy < type.height; dy += 1) for (let dx = 0; dx < type.width; dx += 1) {
    const tile = getWorldTile(state.worldMap, x + dx, y + dy);
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

  it('reserves distinct input slots for distinct transport requests', () => {
    const state = createGameState();
    const building = place(state, 'workshop', 'workshop');
    expect(reserveBuildingInputSlot(state, building.id, 'steel', 'TR-001')).toBe(0);
    expect(reserveBuildingInputSlot(state, building.id, 'steel', 'TR-002')).toBe(1);
    expect(reserveBuildingInputSlot(state, building.id, 'steel', 'TR-003')).toBe(2);
    expect(getReservedInputSlotCount(state, building.id)).toBe(3);
    expect(getFreeInputSlotCount(state, building.id)).toBe(1);
    expect(getInputSlotReservations(state, building.id)).toEqual([
      { state: 'reserved', requestId: 'TR-001', resourceId: 'steel' },
      { state: 'reserved', requestId: 'TR-002', resourceId: 'steel' },
      { state: 'reserved', requestId: 'TR-003', resourceId: 'steel' },
      null,
    ]);
  });

  it('does not allow one request to reserve two slots or a fifth request to exceed capacity', () => {
    const state = createGameState();
    const building = place(state, 'workshop', 'workshop');
    expect(reserveBuildingInputSlot(state, building.id, 'steel', 'TR-001')).toBe(0);
    expect(reserveBuildingInputSlot(state, building.id, 'steel', 'TR-001')).toBe(-1);
    expect(reserveBuildingInputSlot(state, building.id, 'steel', 'TR-002')).toBe(1);
    expect(reserveBuildingInputSlot(state, building.id, 'steel', 'TR-003')).toBe(2);
    expect(reserveBuildingInputSlot(state, building.id, 'steel', 'TR-004')).toBe(3);
    expect(reserveBuildingInputSlot(state, building.id, 'steel', 'TR-005')).toBe(-1);
    expect(getReservedInputSlotCount(state, building.id)).toBe(4);
  });

  it('turns a reservation into a physical input and frees the reservation', () => {
    const state = createGameState();
    const building = place(state, 'workshop', 'workshop');
    expect(reserveBuildingInputSlot(state, building.id, 'steel', 'TR-001')).toBe(0);
    expect(occupyReservedInputSlot(state, building.id, 'TR-001', 'steel')).toBe(true);
    expect(getInputSlotReservations(state, building.id)).toEqual([null, null, null, null]);
    expect(getBuildingInputStorage(state, building.id)).toEqual(['steel', null, null, null]);
    expect(getReservedInputSlotCount(state, building.id)).toBe(0);
  });

  it('releases a reservation so another transport request can use the slot', () => {
    const state = createGameState();
    const building = place(state, 'workshop', 'workshop');
    expect(reserveBuildingInputSlot(state, building.id, 'steel', 'TR-001')).toBe(0);
    expect(reserveBuildingInputSlot(state, building.id, 'steel', 'TR-002')).toBe(1);
    expect(releaseBuildingInputSlot(state, building.id, 'TR-001')).toBe(true);
    expect(reserveBuildingInputSlot(state, building.id, 'steel', 'TR-003')).toBe(0);
  });
});
