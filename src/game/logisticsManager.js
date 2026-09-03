import { findShortestFlagRoutes, rebuildLogisticsNetwork } from './logisticsNetwork.js';
import {
  createBuildingTransportRequest,
  createProductionToWarehouseTransportRequest,
  createWarehouseTransportRequest,
  getBuildingInputStorageCount,
  getBuildingInputStorage,
  getBuildingInventory,
  getFlagCargo,
  stageBuildingOutputAtFlag,
  stageWarehouseCargoForRequest,
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

function planConstructionDemand(state, building) {
  if (!building || building.constructionComplete || !Object.keys(building.constructionMaterialsRequired ?? {}).length) return false;
  const destinationFlag = getBuildingFlag(state, building.id);
  if (!destinationFlag) return false;

  for (const [resourceId, requiredValue] of Object.entries(building.constructionMaterialsRequired ?? {})) {
    const required = Number(requiredValue ?? 0);
    const delivered = Number(building.constructionMaterialsDelivered?.[resourceId] ?? 0);
    const outstanding = (state.transportRequests ?? []).filter((request) => request.destinationBuildingId === building.id
      && request.resourceId === resourceId
      && request.state !== 'delivered').reduce((sum, request) => sum + Math.max(0,
      Number(request.amount ?? 0) - Number(request.delivered ?? 0) - Number(request.inTransit ?? 0)), 0);
    const missing = required - delivered - outstanding;
    if (missing <= 0) continue;

    const warehouses = (state.buildings ?? []).filter((candidate) => candidate.active
      && candidate.ownerId === building.ownerId
      && candidate.id !== building.id
      && getBuildingType(state, candidate)?.role === 'storage'
      && getBuildingInventory(state, candidate.id, resourceId) > 0);
    const warehouse = findNearestDestination(state, warehouses, findShortestFlagRoutes(state, destinationFlag.id));
    if (!warehouse) continue;

    const requestId = `construction-${building.id}-${resourceId}-${state.transportRequests.length + 1}`;
    const request = createWarehouseTransportRequest(
      state, requestId, building.ownerId, resourceId, 1, warehouse.building.id, building.id,
    );
    if (!request) continue;
    state.transportRequests.push(request);
    if (!stageWarehouseCargoForRequest(state, requestId)) {
      state.transportRequests = state.transportRequests.filter((item) => item !== request);
      continue;
    }
    return true;
  }
  return false;
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
  state.logisticsDirtySources.add(`${sourceBuildingId}:${resourceId ?? '*'}`);
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
  for (const key of dirty) {
    const sourceBuildingId = key.slice(0, key.lastIndexOf(':'));
    const source = (state.buildings ?? []).find((building) => building.id === sourceBuildingId);
    if (planSource(state, source)) created += 1;
  }
  for (const building of state.buildings ?? []) {
    if (planConstructionDemand(state, building)) created += 1;
  }
  return created;
}

export function createTransportTasks(state) {
  state.transportRequests ??= [];
  rebuildLogisticsNetwork(state);
  let created = 0;
  for (const building of state.buildings ?? []) {
    if (planConstructionDemand(state, building)) created += 1;
  }
  for (const source of state.buildings ?? []) {
    if (planSource(state, source)) created += 1;
  }
  return created;
}

export function getReadyTransportRequests(state) {
  return (state.transportRequests ?? []).filter((request) => request.state === 'ready' || request.state === 'waiting');
}
