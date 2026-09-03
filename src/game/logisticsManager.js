import { findFlagRoute } from './logisticsNetwork.js';
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

function getRouteDistance(state, route) {
  return route?.roadIds?.reduce((total, roadId) => {
    const road = (state.roads ?? []).find((item) => item.id === roadId);
    return total + (road?.cells?.length ?? Number.MAX_SAFE_INTEGER);
  }, 0) ?? Number.MAX_SAFE_INTEGER;
}

function hasOutstandingRequest(state, buildingId, resourceId) {
  return (state.transportRequests ?? []).some((request) => request.destinationBuildingId === buildingId
    && request.resourceId === resourceId
    && request.state !== 'delivered'
    && Number(request.delivered ?? 0) + Number(request.inTransit ?? 0) < Number(request.amount ?? 0));
}

function findNearestDestination(state, sourceFlag, candidates) {
  return candidates
    .map((candidate) => {
      const flag = getBuildingFlag(state, candidate.id);
      const route = flag ? findFlagRoute(state, sourceFlag.id, flag.id) : null;
      return route ? { building: candidate, flag, route, distance: getRouteDistance(state, route) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance || String(a.building.id).localeCompare(String(b.building.id)))[0] ?? null;
}

export function createTransportTasks(state) {
  state.transportRequests ??= [];
  const buildings = state.buildings ?? [];
  let created = 0;

  for (const source of buildings) {
    if (!source.active) continue;
    const sourceType = getBuildingType(state, source);
    const sourceFlag = getBuildingFlag(state, source.id);
    if (!sourceType?.output?.resourceId || !sourceFlag) continue;

    const resourceId = sourceType.output.resourceId;
    const available = getFlagCargo(state, sourceFlag.id, resourceId) + getBuildingInventory(state, source.id, resourceId);
    if (available <= 0) continue;

    // Priority 1: the nearest production building that accepts this resource.
    // An existing request is not required: the building's input definition is its demand.
    const productionCandidates = buildings.filter((candidate) => {
      if (!candidate.active || candidate.id === source.id || candidate.ownerId !== source.ownerId) return false;
      const type = getBuildingType(state, candidate);
      if (type?.role !== 'production' || !type.input?.[resourceId]) return false;
      if (getBuildingInputStorageCount(state, candidate.id) >= getBuildingInputStorage(state, candidate.id).length) return false;
      return !hasOutstandingRequest(state, candidate.id, resourceId);
    });
    const productionDestination = findNearestDestination(state, sourceFlag, productionCandidates);

    // Priority 2: if no reachable production consumer needs it, send it to the nearest warehouse.
    const warehouseCandidates = buildings.filter((candidate) => {
      if (!candidate.active || candidate.id === source.id || candidate.ownerId !== source.ownerId) return false;
      return getBuildingType(state, candidate)?.role === 'storage';
    });
    const destination = productionDestination ?? findNearestDestination(state, sourceFlag, warehouseCandidates);
    if (!destination) continue;

    while (getFlagCargo(state, sourceFlag.id, resourceId) + getBuildingInventory(state, source.id, resourceId) > 0) {
      const requestId = `transport-${source.id}-${destination.building.id}-${resourceId}-${state.transportRequests.length + 1}`;
      const request = productionDestination
        ? createBuildingTransportRequest(state, requestId, source.ownerId, resourceId, 1, source.id, destination.building.id)
        : createProductionToWarehouseTransportRequest(state, requestId, source.ownerId, resourceId, 1, source.id, destination.building.id);
      if (!request) break;

      // Production/extraction output is normally already on the source flag.
      // Keep support for legacy producer inventory by staging it first.
      if (getFlagCargo(state, sourceFlag.id, resourceId) < 1
        && stageBuildingOutputAtFlag(state, source.id, resourceId, 1) !== 1) break;
      // Validate and cache the route, but leave cargo on the source flag until a road carrier loads it.
      // This preserves the logistics chain: producer flag -> road carrier -> destination flag.
      if (!prepareTransportRequest(state, request)) break;

      state.transportRequests.push(request);
      created += 1;

      // Only one production destination is selected for this pass; the next call can reevaluate demand.
      if (productionDestination) break;
    }
  }

  return created;
}

export function getReadyTransportRequests(state) {
  return (state.transportRequests ?? []).filter((request) => request.state === 'ready' || request.state === 'waiting');
}
