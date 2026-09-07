import { describe, expect, it } from 'vitest';
import { createFlag } from '../src/game/flags.js';
import { createRoad, addRoad } from '../src/game/roads.js';
import { getFlagCargo, getBuildingInventory } from '../src/game/carriers.js';
import { createTransportTasks, processLogisticsTasks, dispatchTransportRequests, advanceDispatchedCarriers, advanceWarehouseCarriers } from '../src/game/logisticsManager.js';
import { advanceBuildingWorkers, createWorker } from '../src/game/workers.js';
import { advanceAllProductions } from '../src/game/production.js';

describe('building logistics and production chain', () => {
  it('moves a resource from warehouse-side flag to input storage and then returns production output to the building flag', () => {
    const state = {
      player: { id: 'player', resources: {} },
      tiles: [],
      flags: [
        createFlag('source-flag', 'source', 'player', 1.5, 1),
        createFlag('destination-flag', 'workshop', 'player', 4.5, 1),
      ],
      roads: [],
      buildings: [
        { id: 'source', ownerId: 'player', typeId: 'source', active: true, inventory: {} },
        { id: 'workshop', ownerId: 'player', typeId: 'workshop', active: true, constructionComplete: true, workerIds: ['worker-1'], inputStorageSlots: [null, null, null, null], outputStorageSlot: null },
      ],
      buildingTypes: [
        { id: 'source', role: 'extraction', output: { resourceId: 'wood', amount: 1 } },
        { id: 'workshop', role: 'production', workerTypeId: 'baker', input: { wood: 1 }, output: { resourceId: 'planks', amount: 1 }, productionTime: 1 },
      ],
      carriers: [],
      transportRequests: [],
      workers: [createWorker('worker-1', 'player', 'baker')],
    };
    state.workers[0].buildingId = 'workshop';
    state.workers[0].state = 'working';
    state.flags[0].cargo = { wood: 1 };

    for (let y = 0; y < 2; y += 1) for (let x = 0; x < 5; x += 1) state.tiles.push({ id: `${x}-${y}`, x, y, terrain: 'plains', resources: {} });
    addRoad(state, createRoad('road-1', 'source-flag', 'destination-flag', ['1-0', '2-0', '3-0', '4-0']));

    expect(createTransportTasks(state)).toBe(1);
    const request = state.transportRequests[0];
    expect(dispatchTransportRequests(state)).toBe(1);
    expect(advanceDispatchedCarriers(state)).toBe(1);
    expect(request.state).toBe('delivered');
    expect(getFlagCargo(state, 'destination-flag', 'wood')).toBe(1);

    expect(advanceBuildingWorkers(state)).toBe(1);
    expect(state.buildings[1].inputStorageSlots).toEqual(['wood', null, null, null]);
    expect(getFlagCargo(state, 'destination-flag', 'wood')).toBe(0);

    expect(advanceAllProductions(state, 1)).toBeTruthy();
    expect(state.buildings[1].outputStorageSlot).toBe('planks');
    expect(state.buildings[1].inputStorageSlots).toEqual([null, null, null, null]);

    expect(advanceBuildingWorkers(state)).toBe(1);
    expect(state.buildings[1].outputStorageSlot).toBeNull();
    expect(getFlagCargo(state, 'destination-flag', 'planks')).toBe(1);
  });

  it('moves finished production from the building flag through the road carrier to the warehouse flag, then the warehouse carrier completes delivery', () => {
    const state = {
      player: { id: 'player', resources: {} },
      tiles: [],
      flags: [
        createFlag('workshop-flag', 'workshop', 'player', 1.5, 1),
        createFlag('warehouse-flag', 'warehouse', 'player', 4.5, 1),
      ],
      roads: [],
      buildings: [
        { id: 'workshop', ownerId: 'player', typeId: 'workshop', active: true, constructionComplete: true, workerIds: ['worker-1'], inputStorageSlots: [null, null, null, null], outputStorageSlot: 'planks' },
        { id: 'warehouse', ownerId: 'player', typeId: 'warehouse', active: true, inventory: {} },
      ],
      buildingTypes: [
        { id: 'workshop', role: 'production', workerTypeId: 'baker', output: { resourceId: 'planks', amount: 1 }, productionTime: 1 },
        { id: 'warehouse', role: 'storage' },
      ],
      carriers: [],
      transportRequests: [],
      workers: [createWorker('worker-1', 'player', 'baker')],
    };
    state.workers[0].buildingId = 'workshop';
    state.workers[0].state = 'working';

    for (let y = 0; y < 2; y += 1) for (let x = 0; x < 5; x += 1) state.tiles.push({ id: `${x}-${y}`, x, y, terrain: 'plains', resources: {} });
    addRoad(state, createRoad('road-1', 'workshop-flag', 'warehouse-flag', ['1-0', '2-0', '3-0', '4-0']));

    expect(advanceBuildingWorkers(state)).toBe(1);
    expect(state.buildings[0].outputStorageSlot).toBeNull();
    expect(getFlagCargo(state, 'workshop-flag', 'planks')).toBe(1);

    expect(processLogisticsTasks(state)).toBe(1);
    const request = state.transportRequests[0];
    expect(request.sourceBuildingId).toBe('workshop');
    expect(request.destinationWarehouseId).toBe('warehouse');

    expect(dispatchTransportRequests(state)).toBe(1);
    expect(advanceDispatchedCarriers(state)).toBe(1);
    expect(request.state).toBe('at_destination');
    expect(getBuildingInventory(state, 'warehouse', 'planks')).toBe(0);
    expect(getFlagCargo(state, 'warehouse-flag', 'planks')).toBe(1);
    expect(getFlagCargo(state, 'workshop-flag', 'planks')).toBe(0);

    expect(advanceWarehouseCarriers(state)).toBe(1);
    expect(request.state).toBe('delivered');
    expect(getBuildingInventory(state, 'warehouse', 'planks')).toBe(1);
    expect(getFlagCargo(state, 'warehouse-flag', 'planks')).toBe(0);
  });

  it('prioritizes a production building request over warehouse storage for finished production', () => {
    const state = {
      player: { id: 'player', resources: {} },
      tiles: [],
      flags: [
        createFlag('source-flag', 'source', 'player', 1.5, 1),
        createFlag('workshop-flag', 'workshop', 'player', 4.5, 1),
        createFlag('warehouse-flag', 'warehouse', 'player', 5.5, 3),
      ],
      roads: [],
      buildings: [
        { id: 'source', ownerId: 'player', typeId: 'source', active: true, inventory: {} },
        { id: 'workshop', ownerId: 'player', typeId: 'workshop', active: true, constructionComplete: true, workerIds: ['worker-1'], inputStorageSlots: [null, null, null, null], outputStorageSlot: null },
        { id: 'warehouse', ownerId: 'player', typeId: 'warehouse', active: true, inventory: {} },
      ],
      buildingTypes: [
        { id: 'source', role: 'production', workerTypeId: 'producer', output: { resourceId: 'planks', amount: 1 }, productionTime: 1 },
        { id: 'workshop', role: 'production', workerTypeId: 'baker', input: { planks: 1 }, output: { resourceId: 'sword', amount: 1 }, productionTime: 1 },
        { id: 'warehouse', role: 'storage' },
      ],
      carriers: [],
      transportRequests: [],
      workers: [createWorker('worker-1', 'player', 'baker')],
    };
    state.workers[0].buildingId = 'workshop';
    state.workers[0].state = 'working';
    state.buildings[0].outputStorageSlot = 'planks';

    for (let y = 0; y < 4; y += 1) for (let x = 0; x < 6; x += 1) state.tiles.push({ id: `${x}-${y}`, x, y, terrain: 'plains', resources: {} });
    addRoad(state, createRoad('road-source-workshop', 'source-flag', 'workshop-flag', ['1-0', '2-0', '3-0', '4-0']));
    addRoad(state, createRoad('road-workshop-warehouse', 'workshop-flag', 'warehouse-flag', ['4-1', '5-2', '5-3']));

    expect(createTransportTasks(state)).toBe(1);
    const request = state.transportRequests[0];
    expect(request.destinationBuildingId).toBe('workshop');
    expect(request.destinationWarehouseId).toBeUndefined();
    expect(request.resourceId).toBe('planks');
  });
});