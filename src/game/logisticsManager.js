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

function findNearestDestination(state, sourceFlag, candidates, routes) {
  return candidates
    .map((candidate) => {
      const flag = getBuildingFlag(state, candidate.id);
      const route = flag ? routes.get(flag.id) : null;
      return route ? { building: candidate, flag, route, distance: route.distance } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance || String(a.building.id).localeCompare(String(b.building.id)))[0] ?? null;
}

export function createTransportTasks(state) {
  state.transportRequests ??= [];
  const buildings = state.buildings ?? [];
  let created = 0;

  // Rebuild the road graph once for this planning pass. Route distances are then
  // calculated once per source flag instead of rebuilding/searching the graph for
  // every source/candidate pair.
  rebuildLogisticsNetwork(state);

  for (const source of buildings) {
    if (!source.active) continue;
    const sourceType = getBuildingType(state, source);
    const sourceFlag = getBuildingFlag(state, source.id);
    if (!sourceType?.output?.resourceId || !sourceFlag) continue;

    const resourceId = sourceType.output.resourceId;
    const available = getFlagCargo(state, sourceFlag.id, resourceId) + getBuildingInventory(state, source.id, resourceId);
    if (available <= 0) continue;

    const routes = findShortestFlagRoutes(state, sourceFlag.id);

    // Priority 1: nearest reachable production building that accepts this resource
    // and still has an input slot. Demand is represented by the building type.
    const productionCandidates = buildings.filter((candidate) => {
      if (!candidate.active || candidate.id === source.id || candidate.ownerId !== source.ownerId) return false;
      const type = getBuildingType(state, candidate);
      if (type?.role !== 'production' || !type.input?.[resourceId]) return false;
      if (getBuildingInputStorageCount(state, candidate.id) >= getBuildingInputStorage(state, candidate.id).length) return false;
      return !hasOutstandingRequest(state, candidate.id, resourceId);
    });
    const productionDestination = findNearestDestination(state, sourceFlag, productionCandidates, routes);

    // Priority 2: if no reachable production consumer needs it, use the nearest
    // reachable warehouse on the same road network.
    const warehouseCandidates = buildings.filter((candidate) => {
      if (!candidate.active || candidate.id === source.id || candidate.ownerId !== source.ownerId) return false;
      return getBuildingType(state, candidate)?.role === 'storage';
    });
    const destination = productionDestination ?? findNearestDestination(state, sourceFlag, warehouseCandidates, routes);
    if (!destination) continue;

    // One source can have many units of cargo, but a request represents one unit.
    // Until a road carrier actually loads the source flag, another planning pass
    // must not reserve the same unit again.
    if (hasOutstandingSourceRequest(state, source.id, resourceId)) continue;

    const requestId = `transport-${source.id}-${destination.building.id}-${resourceId}-${state.transportRequests.length + 1}`;
    const request = productionDestination
      ? createBuildingTransportRequest(state, requestId, source.ownerId, resourceId, 1, source.id, destination.building.id)
      : createProductionToWarehouseTransportRequest(state, requestId, source.ownerId, resourceId, 1, source.id, destination.building.id);
    if (!request) continue;

    // Producer output normally already sits on the producer flag. Legacy producer
    // inventory is staged here only when needed.
    if (getFlagCargo(state, sourceFlag.id, resourceId) < 1
      && stageBuildingOutputAtFlag(state, source.id, resourceId, 1) !== 1) continue;

    if (!prepareTransportRequest(state, request)) continue;

    state.transportRequests.push(request);
    created += 1;
  }

  return created;
}

export function getReadyTransportRequests(state) {
  return (state.transportRequests ?? []).filter((request) => request.state === 'ready' || request.state === 'waiting');
}
