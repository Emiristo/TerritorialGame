import { describe, expect, it } from 'vitest';
import { createFlag } from '../src/game/flags.js';
import { createRoad, addRoad } from '../src/game/roads.js';
import { CARRIER_STATES, createCarrier, addCarrier, getBuildingInventory, getBuildingInputStorage, getFlagCargo, advanceCarrier, createWarehouseTransportRequest, addInventoryToBuilding, stageWarehouseCargoForRequest } from '../src/game/carriers.js';
import { createWorker, extractForWorker } from '../src/game/workers.js';
import { createTransportTasks } from '../src/game/logisticsManager.js';
import { advanceWorkerFinalDelivery } from '../src/game/finalDelivery.js';

function makeState() {
  const tiles = [];
  for (let y = 0; y < 20; y += 1) for (let x = 0; x < 20; x += 1) tiles.push({ id: `${x}-${y}`, x, y, terrain: x === 2 ? 'hills' : 'plains', resources: {} });
  tiles.find((tile) => tile.id === '2-2').resources.stone = 1;
  return { player: { id: 'player', resources: {} }, tiles, flags: [], roads: [], buildings: [
    { id: 'mine', ownerId: 'player', typeId: 'mine', tileId: '2-2', active: true, inventory: {} },
    { id: 'warehouse', ownerId: 'player', typeId: 'warehouse', tileId: '4-2', active: true, inventory: {} },
    { id: 'workshop', ownerId: 'player', typeId: 'workshop', tileId: '7-2', active: true, inventory: {} },
  ], buildingTypes: [
    { id: 'mine', role: 'extraction', output: { resourceId: 'stone', amount: 1 } },
    { id: 'warehouse', role: 'storage', input: {} },
    { id: 'workshop', role: 'production', input: { stone: 1 } },
  ], workZones: [{ id: 'zone-mine', buildingId: 'mine', centerTileId: '2-2', radius: 5 }], workers: [], carriers: [], transportRequests: [] };
}

describe('real resource logistics chain', () => {
  it('delivers warehouse cargo to the destination building through a road and its worker', () => {
    const state = makeState();
    state.flags.push(createFlag('warehouse-flag', 'warehouse', 'player', 4, 4));
    state.flags.push(createFlag('workshop-flag', 'workshop', 'player', 7, 4));
    addRoad(state, createRoad('road-warehouse-workshop', 'warehouse-flag', 'workshop-flag', ['4-3', '5-3', '6-3', '7-3']));
    addInventoryToBuilding(state, 'warehouse', 'stone', 1);
    const request = createWarehouseTransportRequest(state, 'request-1', 'player', 'stone', 1, 'warehouse', 'workshop');
    state.transportRequests.push(request);

    expect(stageWarehouseCargoForRequest(state, request.id)).toBe(true);
    expect(getBuildingInventory(state, 'warehouse', 'stone')).toBe(0);
    expect(getFlagCargo(state, 'warehouse-flag', 'stone')).toBe(1);
    expect(state.carriers).toHaveLength(1);
    expect(state.carriers[0].role).toBe('warehouse');
    expect(advanceCarrier(state, state.carriers[0].id, request.id)).toBe(true);

    addCarrier(state, createCarrier('road-carrier', 'player', 'road-warehouse-workshop'));
    expect(advanceCarrier(state, 'road-carrier', request.id)).toBe(true);
    expect(advanceCarrier(state, 'road-carrier', request.id)).toBe(true);
    expect(getFlagCargo(state, 'workshop-flag', 'stone')).toBe(1);
    expect(getBuildingInventory(state, 'workshop', 'stone')).toBe(0);
    expect(request.state).toBe('at_destination');

    const worker = createWorker('workshop-worker', 'player', 'carpenter');
    worker.buildingId = 'workshop';
    state.workers.push(worker);
    expect(advanceWorkerFinalDelivery(state, worker.id, request.id)).toBe(true);
    expect(worker.state).toBe('carrying');
    expect(getFlagCargo(state, 'workshop-flag', 'stone')).toBe(0);
    expect(advanceWorkerFinalDelivery(state, worker.id, request.id)).toBe(true);
    expect(getBuildingInventory(state, 'workshop', 'stone')).toBe(0);
    expect(getBuildingInputStorage(state, 'workshop')).toContain('stone');
    expect(request.delivered).toBe(1);
    expect(request.state).toBe('delivered');
    expect(worker.state).toBe('idle');
  });

  it('does not let a worker from another building take final delivery', () => {
    const state = makeState();
    state.flags.push(createFlag('warehouse-flag', 'warehouse', 'player', 4, 4));
    state.flags.push(createFlag('workshop-flag', 'workshop', 'player', 7, 4));
    addRoad(state, createRoad('road-warehouse-workshop', 'warehouse-flag', 'workshop-flag', ['4-3', '5-3', '6-3', '7-3']));
    addInventoryToBuilding(state, 'warehouse', 'stone', 1);
    const request = createWarehouseTransportRequest(state, 'request-1', 'player', 'stone', 1, 'warehouse', 'workshop');
    state.transportRequests.push(request);
    expect(stageWarehouseCargoForRequest(state, request.id)).toBe(true);
    const warehouseCarrier = state.carriers[0];
    expect(advanceCarrier(state, warehouseCarrier.id, request.id)).toBe(true);
    addCarrier(state, createCarrier('road-carrier', 'player', 'road-warehouse-workshop'));
    expect(advanceCarrier(state, 'road-carrier', request.id)).toBe(true);
    expect(advanceCarrier(state, 'road-carrier', request.id)).toBe(true);
    const wrongWorker = createWorker('warehouse-worker', 'player', 'resident');
    wrongWorker.buildingId = 'warehouse';
    state.workers.push(wrongWorker);
    expect(advanceWorkerFinalDelivery(state, wrongWorker.id, request.id)).toBe(false);
    expect(getFlagCargo(state, 'workshop-flag', 'stone')).toBe(1);
  });

  it('keeps the warehouse request waiting when the requested resource is absent', () => {
    const state = makeState();
    state.flags.push(createFlag('warehouse-flag', 'warehouse', 'player', 4, 4));
    state.flags.push(createFlag('workshop-flag', 'workshop', 'player', 7, 4));
    addRoad(state, createRoad('road-warehouse-workshop', 'warehouse-flag', 'workshop-flag', ['4-3', '5-3', '6-3', '7-3']));
    const request = createWarehouseTransportRequest(state, 'request-1', 'player', 'stone', 1, 'warehouse', 'workshop');
    state.transportRequests.push(request);
    expect(stageWarehouseCargoForRequest(state, request.id)).toBe(false);
    expect(request.state).toBe('waiting');
    expect(state.carriers).toHaveLength(1);
  });

  it('stages extraction output at the producing building flag', () => {
    const state = makeState();
    state.flags.push(createFlag('mine-flag', 'mine', 'player', 2, 4));
    const worker = createWorker('miner-1', 'player', 'miner');
    worker.buildingId = 'mine'; worker.zoneId = 'zone-mine'; state.workers.push(worker);
    expect(extractForWorker(state, 'miner-1')).toBe(true);
    expect(getBuildingInventory(state, 'mine', 'stone')).toBe(0);
    expect(getFlagCargo(state, 'mine-flag', 'stone')).toBe(1);
  });

  it('prioritizes the nearest production building that needs the resource over a nearer warehouse', () => {
    const state = makeState();
    state.flags.push(createFlag('mine-flag', 'mine', 'player', 2, 4));
    state.flags.push(createFlag('warehouse-flag', 'warehouse', 'player', 4, 4));
    state.flags.push(createFlag('workshop-flag', 'workshop', 'player', 8, 4));
    // The warehouse is one road segment away; the production building is farther
    // through the warehouse node. Production demand must still win by priority.
    addRoad(state, createRoad('road-mine-warehouse', 'mine-flag', 'warehouse-flag', ['2-3', '3-3', '4-3']));
    addRoad(state, createRoad('road-warehouse-workshop', 'warehouse-flag', 'workshop-flag', ['4-4', '5-5', '6-5', '7-5', '8-4']));

    const worker = createWorker('miner-1', 'player', 'miner');
    worker.buildingId = 'mine'; worker.zoneId = 'zone-mine'; state.workers.push(worker);
    expect(extractForWorker(state, 'miner-1')).toBe(true);
    expect(createTransportTasks(state)).toBe(1);
    expect(state.transportRequests[0].destinationBuildingId).toBe('workshop');
    expect(state.transportRequests[0].destinationWarehouseId).toBeUndefined();
    // Creating a task does not teleport or reserve cargo away from the source flag.
    // A road carrier removes it when it actually loads the cargo.
    expect(getFlagCargo(state, 'mine-flag', 'stone')).toBe(1);
  });

  it('sends the resource to the nearest warehouse when no production building needs it', () => {
    const state = makeState();
    state.buildingTypes.find((type) => type.id === 'workshop').input = { wood: 1 };
    state.flags.push(createFlag('mine-flag', 'mine', 'player', 2, 4));
    state.flags.push(createFlag('warehouse-flag', 'warehouse', 'player', 4, 4));
    state.flags.push(createFlag('warehouse-far-flag', 'warehouse-far', 'player', 9, 4));
    state.buildings.push({ id: 'warehouse-far', ownerId: 'player', typeId: 'warehouse', tileId: '9-2', active: true, inventory: {} });
    addRoad(state, createRoad('road-mine-warehouse', 'mine-flag', 'warehouse-flag', ['2-3', '3-3', '4-3']));
    addRoad(state, createRoad('road-warehouse-warehouse-far', 'warehouse-flag', 'warehouse-far-flag', ['4-4', '5-5', '6-5', '7-5', '8-5', '9-4']));

    const worker = createWorker('miner-1', 'player', 'miner');
    worker.buildingId = 'mine'; worker.zoneId = 'zone-mine'; state.workers.push(worker);
    expect(extractForWorker(state, 'miner-1')).toBe(true);
    expect(createTransportTasks(state)).toBe(1);
    const request = state.transportRequests[0];
    expect(request.destinationWarehouseId).toBe('warehouse');
    expect(request.destinationBuildingId).toBe('warehouse');
    expect(getFlagCargo(state, 'mine-flag', 'stone')).toBe(1);
  });
});
