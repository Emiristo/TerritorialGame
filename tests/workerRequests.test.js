import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { createBuilding } from '../src/game/buildings.js';
import { createWorker } from '../src/game/workers.js';
import { WORKER_REQUEST_STATES, createWorkerRequest, createWorkerRequestForBuilding, getWorkerRequestForBuilding, syncWorkerRequests, assignWorkerToRequest } from '../src/game/workerRequests.js';

describe('worker requests', () => {
  function readyBuilding(id, typeId) {
    const building = createBuilding(id, 'player', typeId, '30-30');
    building.active = true;
    building.constructionComplete = true;
    return building;
  }

  it('creates one request for a completed worker building', () => {
    const state = createGameState();
    const building = readyBuilding('lumberjack-1', 'lumberjack_hut');
    state.buildings.push(building);
    const request = createWorkerRequestForBuilding(state, building.id);
    expect(request).toMatchObject({ buildingId: building.id, ownerId: 'player', workerTypeId: 'lumberjack', requiredCount: 1, state: WORKER_REQUEST_STATES.WAITING, assignedWorkerIds: [] });
  });

  it('does not create a request for a building without a worker', () => {
    const state = createGameState();
    const building = readyBuilding('warehouse-1', 'warehouse');
    state.buildings.push(building);
    expect(createWorkerRequest(building.id, building)).toBeNull();
    expect(createWorkerRequestForBuilding(state, building.id)).toBeNull();
    expect(state.workerRequests).toEqual([]);
  });

  it('uses requiredSoldiers for military buildings', () => {
    const request = createWorkerRequest('request-1', readyBuilding('fortress-1', 'fortress'));
    expect(request).toMatchObject({ workerTypeId: 'soldier', requiredCount: 9 });
  });

  it('does not duplicate a request for the same building', () => {
    const state = createGameState();
    const building = readyBuilding('lumberjack-1', 'lumberjack_hut');
    state.buildings.push(building);
    const first = createWorkerRequestForBuilding(state, building.id);
    const second = createWorkerRequestForBuilding(state, building.id);
    expect(second).toBe(first);
    expect(state.workerRequests).toHaveLength(1);
    expect(getWorkerRequestForBuilding(state, building.id)).toBe(first);
  });

  it('syncs requests and removes requests for inactive buildings', () => {
    const state = createGameState();
    const active = readyBuilding('active', 'lumberjack_hut');
    const inactive = readyBuilding('inactive', 'stonecutter_hut');
    state.buildings.push(active, inactive);
    createWorkerRequestForBuilding(state, inactive.id);
    inactive.active = false;
    syncWorkerRequests(state);
    expect(getWorkerRequestForBuilding(state, active.id)).not.toBeNull();
    expect(getWorkerRequestForBuilding(state, inactive.id)).toBeNull();
  });

  it('assigns a matching owned worker and fulfills a one-worker request', () => {
    const state = createGameState();
    const building = readyBuilding('lumberjack-1', 'lumberjack_hut');
    state.buildings.push(building);
    const worker = createWorker('worker-1', 'player', 'lumberjack');
    state.workers.push(worker);
    const request = createWorkerRequestForBuilding(state, building.id);
    expect(assignWorkerToRequest(state, request.id, worker.id)).toBe(true);
    expect(request).toMatchObject({ state: WORKER_REQUEST_STATES.FULFILLED, assignedWorkerIds: ['worker-1'] });
  });

  it('rejects wrong profession and owner', () => {
    const state = createGameState();
    const building = readyBuilding('lumberjack-1', 'lumberjack_hut');
    state.buildings.push(building);
    const request = createWorkerRequestForBuilding(state, building.id);
    state.workers.push(createWorker('wrong-type', 'player', 'stonemason'), createWorker('wrong-owner', 'other', 'lumberjack'));
    expect(assignWorkerToRequest(state, request.id, 'wrong-type')).toBe(false);
    expect(assignWorkerToRequest(state, request.id, 'wrong-owner')).toBe(false);
    expect(request.assignedWorkerIds).toEqual([]);
  });

  it('fulfills a military request only after all required workers are assigned', () => {
    const state = createGameState();
    const building = readyBuilding('barracks-1', 'barracks');
    state.buildings.push(building);
    const request = createWorkerRequestForBuilding(state, building.id);
    const workers = Array.from({ length: 3 }, (_, i) => createWorker(`soldier-${i}`, 'player', 'soldier'));
    state.workers.push(...workers);
    workers.forEach((worker) => expect(assignWorkerToRequest(state, request.id, worker.id)).toBe(true));
    expect(request.state).toBe(WORKER_REQUEST_STATES.FULFILLED);
    expect(request.assignedWorkerIds).toHaveLength(3);
  });

  it('rejects duplicate workers and workers beyond capacity', () => {
    const state = createGameState();
    const building = readyBuilding('barracks-1', 'barracks');
    state.buildings.push(building);
    const request = createWorkerRequestForBuilding(state, building.id);
    const workers = Array.from({ length: 4 }, (_, i) => createWorker(`soldier-${i}`, 'player', 'soldier'));
    state.workers.push(...workers);
    expect(assignWorkerToRequest(state, request.id, workers[0].id)).toBe(true);
    expect(assignWorkerToRequest(state, request.id, workers[0].id)).toBe(false);
    expect(assignWorkerToRequest(state, request.id, workers[1].id)).toBe(true);
    expect(assignWorkerToRequest(state, request.id, workers[2].id)).toBe(true);
    expect(assignWorkerToRequest(state, request.id, workers[3].id)).toBe(false);
    expect(request.assignedWorkerIds).toHaveLength(3);
  });
});
