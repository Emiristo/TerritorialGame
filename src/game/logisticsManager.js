import { findShortestFlagRoutes, rebuildLogisticsNetwork } from './logisticsNetwork.js';
import {
  createBuildingTransportRequest,
  createProductionToWarehouseTransportRequest,
  getBuildingInputStorageCount,
  getBuildingInputStorage,
  getBuildingInventory,
  getFlagCargo,
  stageBuildingOutputAtFlag,
  prepareTransportRequest,
} from './carriers.js';

function getBuildingType(state, building) {
  return (state.buildingTypes ?? []).find((type) => type.id === building?.typeId) ?? null;
}

function getBuildingFlag(state, buildingId) {
  return (state.flags ?? []).find((flag) => flag.buildingId === buildingId) ?? null;
}

function hasOutstandingRequest(state, buildingId, resourceId) {
  return (state.transportRequests ?? []).some((request) => request.destinationBuildingId === buildingId
    && request.resourceId === resourceId
    && request.state !== 'delivered'
    && Number(request.delivered ?? 0) + Number(request.inTransit ?? 0) < Number(request.amount ?? 0));
}

function hasOutstandingSourceRequest(state, sourceBuildingId, resourceId) {
  return (state.transportRequests ?? []).some((request) => request.sourceBuildingId === sourceBuildingId
    && request.resourceId === resourceId
    && request.state !== 'delivered'
    && Number(request.delivered ?? 0) + Number(request.inTransit ?? 0) < Number(request.amount ?? 0));
}

function findNearestDestination(state, candidates, routes) {
  return candidates
    .map((candidate) => {
      const flag = getBuildingFlag(state, candidate.id);
      const route = flag ? routes.get(flag.id) : null;
      return route ? { building: candidate, flag, route, distance: route.distance } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance || String(a.building.id).localeCompare(String(b.building.id)))[0] ?? null;
}

function planSource(state, source) {
  if (!source?.active) return false;
  const sourceType = getBuildingType(state, source);
  const sourceFlag = getBuildingFlag(state, source.id);
  if (!sourceType?.output?.resourceId || !sourceFlag) return false;

  const resourceId = sourceType.output.resourceId;
  const available = getFlagCargo(state, sourceFlag.id, resourceId) + getBuildingInventory(state, source.id, resourceId);
  if (available <= 0 || hasOutstandingSourceRequest(state, source.id, resourceId)) return false;

  const routes = findShortestFlagRoutes(state, sourceFlag.id);
  const productionCandidates = (state.buildings ?? []).filter((candidate) => {
    if (!candidate.active || candidate.id === source.id || candidate.ownerId !== source.ownerId) return false;
    const type = getBuildingType(state, candidate);
    if (type?.role !== 'production' || !type.input?.[resourceId]) return false;
    if (getBuildingInputStorageCount(state, candidate.id) >= getBuildingInputStorage(state, candidate.id).length) return false;
    return !hasOutstandingRequest(state, candidate.id, resourceId);
  });
  const productionDestination = findNearestDestination(state, productionCandidates, routes);

  const warehouseCandidates = (state.buildings ?? []).filter((candidate) => {
    if (!candidate.active || candidate.id === source.id || candidate.ownerId !== source.ownerId) return false;
    return getBuildingType(state, candidate)?.role === 'storage';
  });
  const destination = productionDestination ?? findNearestDestination(state, warehouseCandidates, routes);
  if (!destination) return false;

  const requestId = `transport-${source.id}-${destination.building.id}-${resourceId}-${state.transportRequests.length + 1}`;
  const request = productionDestination
    ? createBuildingTransportRequest(state, requestId, source.ownerId, resourceId, 1, source.id, destination.building.id)
    : createProductionToWarehouseTransportRequest(state, requestId, source.ownerId, resourceId, 1, source.id, destination.building.id);
  if (!request) return false;

  if (getFlagCargo(state, sourceFlag.id, resourceId) < 1
    && stageBuildingOutputAtFlag(state, source.id, resourceId, 1) !== 1) return false;
  if (!prepareTransportRequest(state, request)) return false;

  state.transportRequests.push(request);
  return true;
}

export function markLogisticsDirty(state, sourceBuildingId, resourceId = null) {
  state.logisticsDirtySources ??= new Set();
  const key = `${sourceBuildingId}:${resourceId ?? '*'}`;
  state.logisticsDirtySources.add(key);
}

function consumeDirtySources(state) {
  const dirty = state.logisticsDirtySources ?? new Set();
  state.logisticsDirtySources = new Set();
  return dirty;
}

export function processLogisticsTasks(state) {
  state.transportRequests ??= [];
  const dirty = consumeDirtySources(state);
  if (!dirty.size) return 0;

  rebuildLogisticsNetwork(state);
  let created = 0;
  const sources = state.buildings ?? [];
  for (const key of dirty) {
    const sourceBuildingId = key.slice(0, key.lastIndexOf(':'));
    const source = sources.find((building) => building.id === sourceBuildingId);
    if (planSource(state, source)) created += 1;
  }
  return created;
}

export function createTransportTasks(state) {
  state.transportRequests ??= [];
  rebuildLogisticsNetwork(state);
  let created = 0;
  for (const source of state.buildings ?? []) {
    if (planSource(state, source)) created += 1;
  }
  return created;
}

export function getReadyTransportRequests(state) {
  return (state.transportRequests ?? []).filter((request) => request.state === 'ready' || request.state === 'waiting');
}
