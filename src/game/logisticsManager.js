import { BUILDING_TYPES } from './buildings.js';
import { findShortestFlagRoutes, rebuildLogisticsNetwork } from './logisticsNetwork.js';
import { recordRoadCargo } from './roads.js';
import { markLogisticsDirty } from './logisticsSignals.js';
import {
  createBuildingTransportRequest,
  createProductionToWarehouseTransportRequest,
  createWarehouseTransportRequest,
  getBuildingInputStorageCount,
  getBuildingInputStorage,
  getBuildingInventory,
  getBuildingOutputStorageResource,
  getFlagCargo,
  stageBuildingOutputAtFlag,
  stageWarehouseCargoForRequest,
  prepareTransportRequest,
  loadCarrierFromFlag,
  deliverCarrierToFlag,
  getWarehouseCarrier,
  removeCargoFromFlag,
  addInventoryToBuilding,
  addCargoToFlag,
} from './carriers.js';

function getBuildingType(state, building) {
  return (state.buildingTypes ?? []).find((type) => type.id === building?.typeId)
    ?? Object.values(BUILDING_TYPES).find((type) => type.id === building?.typeId)
    ?? null;
}
function getBuildingFlag(state, buildingId) { return (state.flags ?? []).find((flag) => flag.buildingId === buildingId) ?? null; }
function hasOutstandingRequest(state, buildingId, resourceId) {
  return (state.transportRequests ?? []).some((request) => request.destinationBuildingId === buildingId
    && request.resourceId === resourceId && !['delivered', 'at_destination'].includes(request.state)
    && Number(request.delivered ?? 0) + Number(request.inTransit ?? 0) < Number(request.amount ?? 0));
}
function hasOutstandingSourceRequest(state, sourceBuildingId, resourceId) {
  return (state.transportRequests ?? []).some((request) => request.sourceBuildingId === sourceBuildingId
    && request.resourceId === resourceId && request.state !== 'delivered'
    && Number(request.delivered ?? 0) + Number(request.inTransit ?? 0) < Number(request.amount ?? 0));
}
function findNearestDestination(state, candidates, routes) {
  return candidates.map((candidate) => {
    const flag = getBuildingFlag(state, candidate.id); const route = flag ? routes.get(flag.id) : null;
    return route ? { building: candidate, flag, route, distance: route.distance } : null;
  }).filter(Boolean).sort((a, b) => a.distance - b.distance || String(a.building.id).localeCompare(String(b.building.id)))[0] ?? null;
}
function planConstructionDemand(state, building) {
  if (!building || building.constructionComplete || !Object.keys(building.constructionMaterialsRequired ?? {}).length) return false;
  const destinationFlag = getBuildingFlag(state, building.id); if (!destinationFlag) return false;
  for (const [resourceId, requiredValue] of Object.entries(building.constructionMaterialsRequired ?? {})) {
    const required = Number(requiredValue ?? 0), delivered = Number(building.constructionMaterialsDelivered?.[resourceId] ?? 0);
    const outstanding = (state.transportRequests ?? []).filter((request) => request.destinationBuildingId === building.id
      && request.resourceId === resourceId && !['delivered', 'at_destination'].includes(request.state))
      .reduce((sum, request) => sum + Math.max(0, Number(request.amount ?? 0) - Number(request.delivered ?? 0) - Number(request.inTransit ?? 0)), 0);
    const missing = required - delivered - outstanding; if (missing <= 0) continue;
    const warehouses = (state.buildings ?? []).filter((candidate) => candidate.active && candidate.ownerId === building.ownerId
      && candidate.id !== building.id && getBuildingType(state, candidate)?.role === 'storage'
      && getBuildingInventory(state, candidate.id, resourceId) > 0);
    const warehouse = findNearestDestination(state, warehouses, findShortestFlagRoutes(state, destinationFlag.id)); if (!warehouse) continue;
    const requestId = `construction-${building.id}-${resourceId}-${state.transportRequests.length + 1}`;
    const request = createWarehouseTransportRequest(state, requestId, building.ownerId, resourceId, 1, warehouse.building.id, building.id); if (!request) continue;
    state.transportRequests.push(request);
    if (!stageWarehouseCargoForRequest(state, requestId)) { state.transportRequests = state.transportRequests.filter((item) => item !== request); continue; }
    return true;
  }
  return false;
}

// Production output always prefers an outstanding request from another production building.
// Storage is only the fallback destination when no production consumer can receive the resource.
function planSource(state, source) {
  if (!source?.active) return false;
  const sourceType = getBuildingType(state, source), sourceFlag = getBuildingFlag(state, source.id);
  if (!sourceType?.output?.resourceId || !sourceFlag) return false;
  const resourceId = sourceType.output.resourceId;
  const stagedOutput = getFlagCargo(state, sourceFlag.id, resourceId);
  const outputSlot = getBuildingOutputStorageResource(state, source.id) === resourceId ? 1 : 0;
  const available = stagedOutput + getBuildingInventory(state, source.id, resourceId) + outputSlot;
  if (available <= 0 || hasOutstandingSourceRequest(state, source.id, resourceId)) return false;
  const routes = findShortestFlagRoutes(state, sourceFlag.id);
  const productionCandidates = (state.buildings ?? []).filter((candidate) => {
    if (!candidate.active || candidate.id === source.id || candidate.ownerId !== source.ownerId) return false;
    const type = getBuildingType(state, candidate); if (type?.role !== 'production' || !type.input?.[resourceId]) return false;
    if (getBuildingInputStorageCount(state, candidate.id) >= getBuildingInputStorage(state, candidate.id).length) return false;
    return !hasOutstandingRequest(state, candidate.id, resourceId);
  });
  const productionDestination = findNearestDestination(state, productionCandidates, routes);
  const warehouseCandidates = (state.buildings ?? []).filter((candidate) => candidate.active && candidate.id !== source.id
    && candidate.ownerId === source.ownerId && getBuildingType(state, candidate)?.role === 'storage');
  const destination = productionDestination ?? findNearestDestination(state, warehouseCandidates, routes);
  if (!destination) return false;
  const requestId = `transport-${source.id}-${destination.building.id}-${resourceId}-${state.transportRequests.length + 1}`;
  const request = productionDestination
    ? createBuildingTransportRequest(state, requestId, source.ownerId, resourceId, 1, source.id, destination.building.id)
    : createProductionToWarehouseTransportRequest(state, requestId, source.ownerId, resourceId, 1, source.id, destination.building.id);
  if (!request) return false;
  if (getFlagCargo(state, sourceFlag.id, resourceId) < 1 && stageBuildingOutputAtFlag(state, source.id, resourceId, 1) !== 1) return false;
  if (!prepareTransportRequest(state, request)) return false;
  state.transportRequests.push(request); return true;
}

function getRoadCarrierForRequest(state, request) {
  if (!request?.routeRoadIds?.length) return null;
  for (let index = 0; index < request.routeRoadIds.length; index += 1) {
    const roadId = request.routeRoadIds[index], fromFlagId = request.routeFlagIds?.[index];
    if (getFlagCargo(state, fromFlagId, request.resourceId) <= 0) continue;
    const carrier = (state.carriers ?? []).find((item) => item.role === 'road' && item.roadId === roadId && !item.cargo);
    if (carrier) return carrier;
  }
  return null;
}

function deliverRoadCarrierToFlagOnly(state, carrier, request) {
  const cargo = carrier.cargo;
  const destination = (state.flags ?? []).find((flag) => flag.id === cargo.toFlagId) ?? null;
  if (!destination || destination.id !== request.destinationFlagId) return false;
  if (addCargoToFlag(state, destination.id, cargo.resourceId, cargo.amount) !== cargo.amount) return false;
  request.inTransit = Math.max(0, Number(request.inTransit ?? 0) - cargo.amount);
  recordRoadCargo(state, cargo.roadId, cargo.amount);
  request.state = 'at_destination';
  carrier.cargo = null;
  carrier.state = 'waiting';
  return true;
}

function deliverRoadCarrierToWarehouseFlag(state, carrier, request) {
  return deliverRoadCarrierToFlagOnly(state, carrier, request);
}

function deliverRoadCarrierToProductionFlag(state, carrier, request) {
  const building = (state.buildings ?? []).find((item) => item.id === request.destinationBuildingId) ?? null;
  if (!building || building.constructionComplete === false) return false;
  return deliverRoadCarrierToFlagOnly(state, carrier, request);
}

export function dispatchTransportRequests(state) {
  state.transportRequests ??= []; rebuildLogisticsNetwork(state); let dispatched = 0;
  for (const request of state.transportRequests) {
    if (request.state === 'delivered' || request.state === 'at_destination') continue;
    const carrier = getRoadCarrierForRequest(state, request);
    if (carrier && loadCarrierFromFlag(state, carrier.id, request.id)) dispatched += 1;
  }
  return dispatched;
}

export function advanceDispatchedCarriers(state) {
  let advanced = 0;
  for (const carrier of state.carriers ?? []) {
    if (carrier.role !== 'road' || !carrier.cargo?.requestId) continue;
    const request = (state.transportRequests ?? []).find((item) => item.id === carrier.cargo.requestId) ?? null;
    if (request?.destinationWarehouseId && carrier.cargo.toFlagId === request.destinationFlagId) {
      if (deliverRoadCarrierToWarehouseFlag(state, carrier, request)) advanced += 1;
    } else if (request?.destinationBuildingId && !request.destinationWarehouseId && carrier.cargo.toFlagId === request.destinationFlagId) {
      const destinationBuilding = (state.buildings ?? []).find((item) => item.id === request.destinationBuildingId) ?? null;
      if (destinationBuilding?.constructionComplete) {
        if (deliverRoadCarrierToProductionFlag(state, carrier, request)) advanced += 1;
      } else if (deliverCarrierToFlag(state, carrier.id)) {
        advanced += 1;
      }
    } else if (deliverCarrierToFlag(state, carrier.id)) {
      advanced += 1;
    }
  }
  return advanced;
}

// A warehouse flag is only a transfer point. The request becomes delivered after the warehouse carrier moves the cargo into inventory.
export function advanceWarehouseCarriers(state) {
  let completed = 0;
  for (const request of state.transportRequests ?? []) {
    if (request.state !== 'at_destination' || !request.destinationWarehouseId) continue;
    if (Number(request.delivered ?? 0) >= Number(request.amount ?? 0)) continue;
    const flag = getBuildingFlag(state, request.destinationWarehouseId);
    if (!flag || getFlagCargo(state, flag.id, request.resourceId) < 1) continue;
    const carrier = getWarehouseCarrier(state, request.destinationWarehouseId);
    if (!carrier || carrier.cargo) continue;
    const amount = removeCargoFromFlag(state, flag.id, request.resourceId, 1);
    if (amount !== 1) continue;
    carrier.cargo = { requestId: request.id, resourceId: request.resourceId, amount: 1 };
    carrier.state = 'carrying';
    if (addInventoryToBuilding(state, request.destinationWarehouseId, request.resourceId, 1) !== 1) continue;
    request.delivered = Number(request.delivered ?? 0) + 1;
    request.state = Number(request.delivered) >= Number(request.amount ?? 0) ? 'delivered' : 'at_destination';
    carrier.cargo = null;
    carrier.state = 'idle';
    completed += 1;
  }
  return completed;
}

function consumeDirtySources(state) { const dirty = state.logisticsDirtySources ?? new Set(); state.logisticsDirtySources = new Set(); return dirty; }
export function processLogisticsTasks(state) { state.transportRequests ??= []; const dirty = consumeDirtySources(state); rebuildLogisticsNetwork(state); let created = 0; for (const key of dirty) { const sourceBuildingId = key.slice(0, key.lastIndexOf(':')); const source = (state.buildings ?? []).find((building) => building.id === sourceBuildingId); if (planSource(state, source)) created += 1; } for (const building of state.buildings ?? []) if (planConstructionDemand(state, building)) created += 1; return created; }
export function createTransportTasks(state) { state.transportRequests ??= []; rebuildLogisticsNetwork(state); let created = 0; for (const building of state.buildings ?? []) if (planConstructionDemand(state, building)) created += 1; for (const source of state.buildings ?? []) if (planSource(state, source)) created += 1; return created; }
export function getReadyTransportRequests(state) { return (state.transportRequests ?? []).filter((request) => request.state === 'ready' || request.state === 'waiting'); }

export { markLogisticsDirty };
