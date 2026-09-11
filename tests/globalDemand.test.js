import { describe, expect, it } from 'vitest';
import { createFlag } from '../src/game/flags.js';
import { createWorker, extractForWorker } from '../src/game/workers.js';
import { addRoad, createRoad } from '../src/game/roads.js';
import { getGlobalDemand, rebuildGlobalDemand } from '../src/game/globalDemand.js';
import { getFlagCargo } from '../src/game/carriers.js';
import { processLogisticsTasks } from '../src/game/logisticsManager.js';
import { createWorldMap, getWorldTile } from '../src/game/world/worldMap.js';

function makeState() {
  const worldMap = createWorldMap(100, 100);
  for (let y = 0; y < worldMap.height; y += 1) {
    for (let x = 0; x < worldMap.width; x += 1) {
      getWorldTile(worldMap, x, y).terrain = 'hills';
    }
  }
  getWorldTile(worldMap, 2, 2).resources.stone = 1;

  return {
    player: { id: 'player', resources: {} },
    worldMap,
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

  it('uses four physical input slots as two recipe sets for a two-input recipe', () => {
    const state = makeState();
    state.buildingTypes.find((type) => type.id === 'workshop').input = { flour: 1, water: 1 };
    rebuildGlobalDemand(state);

    expect(getGlobalDemand(state, 'flour')).toEqual([
      { buildingId: 'workshop', ownerId: 'player', resourceId: 'flour', amount: 2 },
    ]);
    expect(getGlobalDemand(state, 'water')).toEqual([
      { buildingId: 'workshop', ownerId: 'player', resourceId: 'water', amount: 2 },
    ]);
  });

  it('reduces demand by resources already physically stored or reserved', () => {
    const state = makeState();
    const workshop = state.buildings.find((building) => building.id === 'workshop');
    state.buildingTypes.find((type) => type.id === 'workshop').input = { flour: 1, water: 1 };
    workshop.inputStorageSlots = ['flour', 'water', null, null];
    workshop.inputSlotReservations = [null, null, { state: 'reserved', requestId: 'water-1', resourceId: 'water' }, null];

    rebuildGlobalDemand(state);

    expect(getGlobalDemand(state, 'flour')).toEqual([
      { buildingId: 'workshop', ownerId: 'player', resourceId: 'flour', amount: 1 },
    ]);
    expect(getGlobalDemand(state, 'water')).toEqual([]);
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
