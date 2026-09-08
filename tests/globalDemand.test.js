import { describe, expect, it } from 'vitest';
import { createFlag } from '../src/game/flags.js';
import { createWorker, extractForWorker } from '../src/game/workers.js';
import { addRoad, createRoad } from '../src/game/roads.js';
import { getGlobalDemand, rebuildGlobalDemand } from '../src/game/globalDemand.js';
import { getFlagCargo } from '../src/game/carriers.js';
import { processLogisticsTasks } from '../src/game/logisticsManager.js';

function makeState() {
  return {
    player: { id: 'player', resources: {} },
    tiles: [{ id: '2-2', x: 2, y: 2, terrain: 'hills', resources: { stone: 1 } }],
    flags: [],
    roads: [],
    buildings: [
      { id: 'miner', ownerId: 'player', typeId: 'mine', tileId: '2-2', active: true, inventory: {} },
      { id: 'workshop', ownerId: 'player', typeId: 'workshop', tileId: '7-2', active: true, inventory: {}, inputStorageSlots: [null, null, null, null] },
      { id: 'warehouse', ownerId: 'player', typeId: 'warehouse', tileId: '4-2', active: true, inventory: {} },
    ],
    buildingTypes: [
      { id: 'mine', role: 'extraction', output: { resourceId: 'stone', amount: 1 } },
      { id: 'workshop', role: 'production', input: { stone: 1 } },
      { id: 'warehouse', role: 'storage', input: {} },
    ],
    workers: [],
    carriers: [],
    transportRequests: [],
    globalDemand: {},
    workZones: [{ id: 'zone-miner', buildingId: 'miner', centerTileId: '2-2', radius: 5 }],
  };
}

describe('global production demand', () => {
  it('contains production consumers and never extraction buildings', () => {
    const state = makeState();
    rebuildGlobalDemand(state);
    expect(getGlobalDemand(state, 'stone')).toEqual([
      { buildingId: 'workshop', ownerId: 'player', resourceId: 'stone', amount: 4 },
    ]);
    expect(Object.values(state.globalDemand).flat().some((entry) => entry.buildingId === 'miner')).toBe(false);
  });

  it('makes a source deliver directly to the nearest demanded consumer', () => {
    const state = makeState();
    state.flags.push(createFlag('miner-flag', 'miner', 'player', 2, 4));
    state.flags.push(createFlag('warehouse-flag', 'warehouse', 'player', 4, 4));
    state.flags.push(createFlag('workshop-flag', 'workshop', 'player', 8, 4));
    addRoad(state, createRoad('road-miner-warehouse', 'miner-flag', 'warehouse-flag', ['2-3', '3-3', '4-3']));
    addRoad(state, createRoad('road-warehouse-workshop', 'warehouse-flag', 'workshop-flag', ['4-4', '5-5', '6-5', '7-5', '8-4']));

    const worker = createWorker('miner-worker', 'player', 'miner');
    worker.buildingId = 'miner';
    worker.zoneId = 'zone-miner';
    state.workers.push(worker);

    expect(extractForWorker(state, 'miner-worker')).toBe(true);
    expect(processLogisticsTasks(state)).toBe(1);
    expect(state.transportRequests[0].destinationBuildingId).toBe('workshop');
    expect(state.transportRequests[0].destinationWarehouseId).toBeUndefined();
    expect(getFlagCargo(state, 'miner-flag', 'stone')).toBe(1);
  });

  it('falls back to a warehouse when Global Demand has no consumer', () => {
    const state = makeState();
    state.buildingTypes.find((type) => type.id === 'workshop').input = { wood: 1 };
    state.flags.push(createFlag('miner-flag', 'miner', 'player', 2, 4));
    state.flags.push(createFlag('warehouse-flag', 'warehouse', 'player', 4, 4));
    addRoad(state, createRoad('road-miner-warehouse', 'miner-flag', 'warehouse-flag', ['2-3', '3-3', '4-3']));

    const worker = createWorker('miner-worker', 'player', 'miner');
    worker.buildingId = 'miner';
    worker.zoneId = 'zone-miner';
    state.workers.push(worker);

    expect(extractForWorker(state, 'miner-worker')).toBe(true);
    expect(processLogisticsTasks(state)).toBe(1);
    expect(state.transportRequests[0].destinationWarehouseId).toBe('warehouse');
  });
});
