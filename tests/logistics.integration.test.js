import { describe, expect, it } from 'vitest';
import { createWorker, extractForWorker } from '../src/game/workers.js';
import { createFlag } from '../src/game/flags.js';
import { createRoad, addRoad } from '../src/game/roads.js';
import { getBuildingInventory, getFlagCargo, stageWarehouseCargoForRequest } from '../src/game/carriers.js';
import { createTransportTasks } from '../src/game/logisticsManager.js';

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

describe('logistics integration', () => {
  it('stages warehouse cargo at the warehouse flag before road transport', () => {
    const state = makeState();
    state.buildings.find((building) => building.id === 'warehouse').inventory.stone = 1;
    state.flags.push(createFlag('warehouse-flag', 'warehouse', 'player', 4, 4));
    state.flags.push(createFlag('workshop-flag', 'workshop', 'player', 8, 4));
    addRoad(state, createRoad('road-warehouse-workshop', 'warehouse-flag', 'workshop-flag', ['4-4', '5-5', '6-5', '7-5', '8-4']));
    const request = {
      id: 'request-1', ownerId: 'player', resourceId: 'stone', amount: 1, delivered: 0, inTransit: 0,
      sourceFlagId: 'warehouse-flag', destinationFlagId: 'workshop-flag', sourceWarehouseId: 'warehouse',
      destinationBuildingId: 'workshop', state: 'waiting', routeFlagIds: [], routeRoadIds: [],
    };
    state.transportRequests.push(request);
    expect(stageWarehouseCargoForRequest(state, request.id)).toBe(true);
    expect(request.state).toBe('ready');
    expect(getBuildingInventory(state, 'warehouse', 'stone')).toBe(0);
    expect(getFlagCargo(state, 'warehouse-flag', 'stone')).toBe(1);
  });

  it('does not stage warehouse cargo when the warehouse has no resource', () => {
    const state = makeState();
    state.flags.push(createFlag('warehouse-flag', 'warehouse', 'player', 4, 4));
    state.flags.push(createFlag('workshop-flag', 'workshop', 'player', 8, 4));
    addRoad(state, createRoad('road-warehouse-workshop', 'warehouse-flag', 'workshop-flag', ['4-4', '5-5', '6-5', '7-5', '8-4']));
    const request = {
      id: 'request-1', ownerId: 'player', resourceId: 'stone', amount: 1, delivered: 0, inTransit: 0,
      sourceFlagId: 'warehouse-flag', destinationFlagId: 'workshop-flag', sourceWarehouseId: 'warehouse',
      destinationBuildingId: 'workshop', state: 'waiting', routeFlagIds: [], routeRoadIds: [],
    };
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
    addRoad(state, createRoad('road-mine-warehouse', 'mine-flag', 'warehouse-flag', ['2-3', '3-3', '4-3']));
    addRoad(state, createRoad('road-warehouse-workshop', 'warehouse-flag', 'workshop-flag', ['4-4', '5-5', '6-5', '7-5', '8-4']));

    const worker = createWorker('miner-1', 'player', 'miner');
    worker.buildingId = 'mine'; worker.zoneId = 'zone-mine'; state.workers.push(worker);
    expect(extractForWorker(state, 'miner-1')).toBe(true);
    expect(state.transportRequests).toHaveLength(1);
    expect(state.transportRequests[0].destinationBuildingId).toBe('workshop');
    expect(state.transportRequests[0].destinationWarehouseId).toBeUndefined();
    expect(getFlagCargo(state, 'mine-flag', 'stone')).toBe(1);
    expect(createTransportTasks(state)).toBe(0);
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
    expect(state.transportRequests).toHaveLength(1);
    const request = state.transportRequests[0];
    expect(request.destinationWarehouseId).toBe('warehouse');
    expect(request.destinationBuildingId).toBe('warehouse');
    expect(getFlagCargo(state, 'mine-flag', 'stone')).toBe(1);
    expect(createTransportTasks(state)).toBe(0);
  });

  it('keeps logistics bounded with 100+ production buildings and repeated planning passes', () => {
    const state = makeState();
    state.buildings = [];
    state.flags = [];
    state.roads = [];
    state.transportRequests = [];

    const sources = 10;
    const productions = 101;
    const warehouses = 5;
    const total = sources + productions + warehouses;
    const flags = [];

    for (let i = 0; i < total; i += 1) {
      const x = i % 20;
      const y = Math.floor(i / 20);
      let id;
      let typeId;
      if (i < sources) {
        id = `mine-${i}`;
        typeId = 'mine';
      } else if (i < sources + productions) {
        id = `workshop-${i - sources}`;
        typeId = 'workshop';
      } else {
        id = `warehouse-${i - sources - productions}`;
        typeId = 'warehouse';
      }
      state.buildings.push({ id, ownerId: 'player', typeId, tileId: `${x}-${y}`, active: true, inventory: {} });
      const flag = createFlag(`flag-${id}`, id, 'player', x, y);
      flag.cargo = {};
      state.flags.push(flag);
      flags.push(flag);
    }

    state.buildingTypes = [
      { id: 'mine', role: 'extraction', output: { resourceId: 'stone', amount: 1 } },
      { id: 'workshop', role: 'production', input: { stone: 1 } },
      { id: 'warehouse', role: 'storage', input: {} },
    ];

    // Build a long connected logistics chain. The final production building is
    // intentionally unreachable, proving the planner ignores disconnected demand.
    for (let i = 0; i < total - 2; i += 1) {
      state.roads.push({
        id: `road-${i}`,
        startFlagId: flags[i].id,
        endFlagId: flags[i + 1].id,
        cells: [`${i % 20}-${Math.floor(i / 20)}`],
        active: true,
        level: 1,
      });
    }

    // Make the nearest production slot unavailable; the planner must continue to
    // the next reachable production building rather than falling back to a warehouse.
    state.buildings.find((building) => building.id === 'workshop-0').inputStorageSlots = ['stone', 'stone', 'stone', 'stone', 'stone'];
    state.buildings.find((building) => building.id === 'workshop-100').inputStorageSlots = ['stone', 'stone', 'stone', 'stone', 'stone'];

    for (let i = 0; i < sources; i += 1) flags[i].cargo.stone = 1;

    expect(createTransportTasks(state)).toBe(sources);
    expect(state.transportRequests).toHaveLength(sources);
    expect(state.transportRequests.every((request) => request.destinationBuildingId !== 'workshop-100')).toBe(true);
    expect(state.transportRequests.every((request) => request.destinationBuildingId !== 'warehouse-0')).toBe(true);

    // Replanning must be idempotent: repeated global passes cannot create duplicate
    // requests while the original source cargo is still awaiting a road carrier.
    for (let i = 0; i < 100; i += 1) expect(createTransportTasks(state)).toBe(0);
    expect(state.transportRequests).toHaveLength(sources);
    expect(flags.slice(0, sources).every((flag) => getFlagCargo(state, flag.id, 'stone') === 1)).toBe(true);
  });
});
