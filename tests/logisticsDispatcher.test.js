import { describe, expect, it } from 'vitest';
import { BUILDING_TYPES, addBuilding } from '../src/game/buildings.js';
import { createGameState } from '../src/game/state.js';
import { addRoad, createRoad, findShortestRoadPaths } from '../src/game/roads.js';
import { createWarehouseTransportRequest, addCargoToFlag } from '../src/game/carriers.js';
import { dispatchTransportRequests, advanceDispatchedCarriers } from '../src/game/logisticsManager.js';

function addDestinationBuilding(state, id = 'dispatcher-destination') {
  const x = 40;
  const y = 40;
  const type = BUILDING_TYPES.STONECUTTER_HUT;
  for (let dy = 0; dy < type.height; dy += 1) for (let dx = 0; dx < type.width; dx += 1) {
    const tile = state.tiles.find((item) => item.x === x + dx && item.y === y + dy);
    tile.ownerId = state.player.id;
    tile.terrain = 'plains';
  }
  return addBuilding(state, id, state.player.id, type.id, `${x}-${y}`);
}

function connectFlags(state, id, startFlagId, endFlagId) {
  const path = findShortestRoadPaths(state, startFlagId, endFlagId)[0];
  if (!path) throw new Error(`Test road path not found: ${startFlagId} -> ${endFlagId}`);
  return addRoad(state, createRoad(id, startFlagId, endFlagId, path));
}

describe('logistics dispatcher', () => {
  it('assigns a ready request to an existing road carrier', () => {
    const state = createGameState();
    const warehouse = state.buildings.find((building) => building.typeId === BUILDING_TYPES.HEADQUARTERS.id);
    const destination = addDestinationBuilding(state);
    const warehouseFlag = state.flags.find((flag) => flag.buildingId === warehouse.id);
    const destinationFlag = state.flags.find((flag) => flag.buildingId === destination.id);
    connectFlags(state, 'road-warehouse-destination', warehouseFlag.id, destinationFlag.id);

    const roadCarriersBefore = state.carriers.filter((carrier) => carrier.role === 'road').length;
    const request = createWarehouseTransportRequest(state, 'request-1', state.player.id, 'stone', 1, warehouse.id, destination.id);
    state.transportRequests.push(request);
    addCargoToFlag(state, warehouseFlag.id, 'stone', 1);
    request.state = 'ready';

    expect(dispatchTransportRequests(state)).toBe(1);
    expect(state.carriers.filter((carrier) => carrier.role === 'road')).toHaveLength(roadCarriersBefore);
    expect(state.carriers.find((carrier) => carrier.role === 'road')?.cargo?.requestId).toBe('request-1');
    expect(request.state).toBe('inTransit');
  });

  it('keeps one request alive while two road carriers execute two route stages', () => {
    const state = createGameState();
    const warehouse = state.buildings.find((building) => building.typeId === BUILDING_TYPES.HEADQUARTERS.id);
    const destination = addDestinationBuilding(state);
    const warehouseFlag = state.flags.find((flag) => flag.buildingId === warehouse.id);
    const destinationFlag = state.flags.find((flag) => flag.buildingId === destination.id);
    const middleFlag = { id: 'middle-flag', ownerId: state.player.id, buildingId: null, x: 46, y: 47, cargo: {} };
    state.flags.push(middleFlag);

    connectFlags(state, 'road-1', warehouseFlag.id, middleFlag.id);
    connectFlags(state, 'road-2', middleFlag.id, destinationFlag.id);
    const request = createWarehouseTransportRequest(state, 'request-2', state.player.id, 'stone', 1, warehouse.id, destination.id);
    state.transportRequests.push(request);
    addCargoToFlag(state, warehouseFlag.id, 'stone', 1);
    request.state = 'ready';

    expect(dispatchTransportRequests(state)).toBe(1);
    expect(request.state).toBe('inTransit');
    expect(advanceDispatchedCarriers(state)).toBe(1);
    expect(request.state).toBe('ready');
    expect(dispatchTransportRequests(state)).toBe(1);
    expect(advanceDispatchedCarriers(state)).toBe(1);
    expect(request.state).toBe('delivered');
    expect(state.flags.find((flag) => flag.id === destinationFlag.id)?.cargo?.stone).toBe(1);
  });
});
