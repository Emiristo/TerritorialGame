import { BUILDING_TYPES } from './buildings.js';

export const WORKER_REQUEST_STATES = {
  WAITING: 'WAITING',
  FULFILLED: 'FULFILLED',
};

function findBuildingType(building) {
  return Object.values(BUILDING_TYPES).find((type) => type.id === building?.typeId) ?? null;
}

function getRequiredWorkerCount(building, type) {
  if (!type?.workerTypeId) return 0;
  if (type.role === 'military') return Number(type.requiredSoldiers ?? 0);
  return 1;
}

export function createWorkerRequest(id, building) {
  const type = findBuildingType(building);
  const requiredCount = getRequiredWorkerCount(building, type);
  if (!building || !type || requiredCount <= 0) return null;
  return {
    id,
    ownerId: building.ownerId,
    buildingId: building.id,
    workerTypeId: type.workerTypeId,
    requiredCount,
    assignedWorkerIds: [],
    state: WORKER_REQUEST_STATES.WAITING,
  };
}

export function getWorkerRequestForBuilding(state, buildingId) {
  return (state.workerRequests ?? []).find((request) => request.buildingId === buildingId) ?? null;
}

export function createWorkerRequestForBuilding(state, buildingId, id = `worker-request-${buildingId}`) {
  const building = (state.buildings ?? []).find((item) => item.id === buildingId) ?? null;
  if (!building || !building.active || !building.constructionComplete) return null;
  const existing = getWorkerRequestForBuilding(state, buildingId);
  if (existing) return existing;
  const request = createWorkerRequest(id, building);
  if (!request) return null;
  state.workerRequests ??= [];
  state.workerRequests.push(request);
  return request;
}

export function syncWorkerRequests(state) {
  state.workerRequests ??= [];
  const activeWorkerBuildings = new Map(
    (state.buildings ?? [])
      .filter((building) => building.active && building.constructionComplete)
      .map((building) => [building.id, building]),
  );

  state.workerRequests = state.workerRequests.filter((request) => activeWorkerBuildings.has(request.buildingId));
  for (const building of activeWorkerBuildings.values()) createWorkerRequestForBuilding(state, building.id);
  return state;
}

export function assignWorkerToRequest(state, requestId, workerId) {
  const request = (state.workerRequests ?? []).find((item) => item.id === requestId) ?? null;
  const worker = (state.workers ?? []).find((item) => item.id === workerId) ?? null;
  if (!request || !worker) return false;
  if (request.state === WORKER_REQUEST_STATES.FULFILLED) return false;
  if (request.ownerId !== worker.ownerId || request.workerTypeId !== worker.typeId) return false;
  if (request.assignedWorkerIds.includes(workerId)) return false;
  if (request.assignedWorkerIds.length >= request.requiredCount) return false;
  request.assignedWorkerIds.push(workerId);
  if (request.assignedWorkerIds.length === request.requiredCount) request.state = WORKER_REQUEST_STATES.FULFILLED;
  return true;
}
