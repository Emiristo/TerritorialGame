import { findFlagRoute } from './logisticsNetwork.js';

export const CARRIER_STATES = Object.freeze({ IDLE: 'idle', WAITING: 'waiting', CARRYING: 'carrying' });

function getFlag(state, flagId) { return (state.flags ?? []).find((flag) => flag.id === flagId) ?? null; }
function getRoad(state, roadId) { return (state.roads ?? []).find((road) => road.id === roadId && road.active) ?? null; }
function getCarrier(state, carrierId) { return (state.carriers ?? []).find((carrier) => carrier.id === carrierId) ?? null; }
function getBuilding(state, buildingId) { return (state.buildings ?? []).find((building) => building.id === buildingId) ?? null; }
function ensureFlagCargo(flag) { flag.cargo ??= {}; return flag.cargo; }
function ensureBuildingInventory(building) { building.inventory ??= {}; return building.inventory; }

export function createCarrier(id, ownerId, roadId = null) { return { id, ownerId, typeId: 'carrier', state: roadId ? CARRIER_STATES.WAITING : CARRIER_STATES.IDLE, roadId, cargo: null }; }
export function createTransportRequest(id, ownerId, resourceId, amount, sourceFlagId, destinationFlagId) { return { id, ownerId, resourceId, amount: Math.max(0, Math.floor(Number(amount) || 0)), delivered: 0, sourceFlagId, destinationFlagId, routeFlagIds: [], routeRoadIds: [], state: 'waiting' }; }
export function createBuildingTransportRequest(state, id, ownerId, resourceId, amount, sourceBuildingId, destinationBuildingId) {
  const sourceFlag = (state.flags ?? []).find((flag) => flag.buildingId === sourceBuildingId) ?? null;
  const destinationFlag = (state.flags ?? []).find((flag) => flag.buildingId === destinationBuildingId) ?? null;
  if (!sourceFlag || !destinationFlag) return null;
  return createTransportRequest(id, ownerId, resourceId, amount, sourceFlag.id, destinationFlag.id);
}

export function addCarrier(state, carrier) {
  state.carriers ??= [];
  if (state.carriers.some((item) => item.id === carrier.id)) throw new Error(`Carrier already exists: ${carrier.id}`);
  if (carrier.roadId && state.carriers.some((item) => item.roadId === carrier.roadId)) throw new Error('Road segment already has a carrier');
  if (carrier.roadId && !getRoad(state, carrier.roadId)) throw new Error('Carrier road does not exist');
  state.carriers.push(carrier); return carrier;
}
export function assignCarrierToRoad(state, carrierId, roadId) {
  const carrier = getCarrier(state, carrierId), road = getRoad(state, roadId);
  if (!carrier || !road || carrier.cargo) return false;
  if ((state.carriers ?? []).some((item) => item.id !== carrierId && item.roadId === roadId)) return false;
  carrier.roadId = roadId; carrier.state = CARRIER_STATES.WAITING; return true;
}
export function removeCarrierFromRoad(state, carrierId) { const carrier = getCarrier(state, carrierId); if (!carrier || carrier.cargo) return false; carrier.roadId = null; carrier.state = CARRIER_STATES.IDLE; return true; }
export function getCarrierRoad(state, carrierId) { const carrier = getCarrier(state, carrierId); return carrier?.roadId ? getRoad(state, carrier.roadId) : null; }

export function addCargoToFlag(state, flagId, resourceId, amount = 1) {
  const flag = getFlag(state, flagId), units = Math.max(0, Math.floor(Number(amount) || 0));
  if (!flag || !resourceId || units <= 0) return 0;
  const cargo = ensureFlagCargo(flag); cargo[resourceId] = Number(cargo[resourceId] ?? 0) + units; return units;
}
export function getFlagCargo(state, flagId, resourceId) { return Number(getFlag(state, flagId)?.cargo?.[resourceId] ?? 0); }
export function removeCargoFromFlag(state, flagId, resourceId, amount = 1) {
  const flag = getFlag(state, flagId), available = getFlagCargo(state, flagId, resourceId);
  const units = Math.max(0, Math.min(Math.floor(Number(amount) || 0), available));
  if (!flag || units <= 0) return 0;
  flag.cargo[resourceId] = available - units; return units;
}

export function addInventoryToBuilding(state, buildingId, resourceId, amount = 1) {
  const building = getBuilding(state, buildingId), units = Math.max(0, Math.floor(Number(amount) || 0));
  if (!building || !resourceId || units <= 0) return 0;
  const inventory = ensureBuildingInventory(building); inventory[resourceId] = Number(inventory[resourceId] ?? 0) + units; return units;
}
export function getBuildingInventory(state, buildingId, resourceId) { return Number(getBuilding(state, buildingId)?.inventory?.[resourceId] ?? 0); }
export function removeInventoryFromBuilding(state, buildingId, resourceId, amount = 1) {
  const building = getBuilding(state, buildingId), available = getBuildingInventory(state, buildingId, resourceId);
  const units = Math.max(0, Math.min(Math.floor(Number(amount) || 0), available));
  if (!building || units <= 0) return 0;
  building.inventory[resourceId] = available - units; return units;
}

export function stageBuildingOutputAtFlag(state, buildingId, resourceId, amount = 1) {
  const flag = (state.flags ?? []).find((item) => item.buildingId === buildingId) ?? null;
  const units = removeInventoryFromBuilding(state, buildingId, resourceId, amount);
  if (!flag || units <= 0) {
    if (units > 0) addInventoryToBuilding(state, buildingId, resourceId, units);
    return 0;
  }
  return addCargoToFlag(state, flag.id, resourceId, units);
}

export function deliverFlagCargoToBuilding(state, flagId, resourceId, amount = 1) {
  const flag = getFlag(state, flagId);
  if (!flag?.buildingId) return 0;
  const units = removeCargoFromFlag(state, flagId, resourceId, amount);
  if (units <= 0) return 0;
  return addInventoryToBuilding(state, flag.buildingId, resourceId, units);
}

export function prepareTransportRequest(state, request) {
  if (!request || request.amount <= request.delivered || request.ownerId !== state.player?.id) return false;
  if (!getFlag(state, request.sourceFlagId) || !getFlag(state, request.destinationFlagId)) return false;
  const route = findFlagRoute(state, request.sourceFlagId, request.destinationFlagId);
  if (!route || route.flagIds.length < 2) return false;
  request.routeFlagIds = route.flagIds; request.routeRoadIds = route.roadIds; request.state = 'ready'; return true;
}

function getSegmentForRoad(request, road) {
  const index = (request.routeRoadIds ?? []).indexOf(road.id);
  if (index < 0) return null;
  return { index, fromFlagId: request.routeFlagIds[index], toFlagId: request.routeFlagIds[index + 1] };
}

export function loadCarrierFromFlag(state, carrierId, requestId) {
  const carrier = getCarrier(state, carrierId), request = (state.transportRequests ?? []).find((item) => item.id === requestId) ?? null, road = getCarrierRoad(state, carrierId);
  if (!carrier || !request || !road || carrier.cargo || carrier.ownerId !== request.ownerId) return false;
  if (!prepareTransportRequest(state, request)) return false;
  const segment = getSegmentForRoad(request, road);
  if (!segment || segment.index >= request.routeRoadIds.length) return false;
  if (!removeCargoFromFlag(state, segment.fromFlagId, request.resourceId, 1)) return false;
  carrier.cargo = { requestId: request.id, resourceId: request.resourceId, amount: 1, fromFlagId: segment.fromFlagId, toFlagId: segment.toFlagId };
  carrier.state = CARRIER_STATES.CARRYING; return true;
}

export function deliverCarrierToFlag(state, carrierId) {
  const carrier = getCarrier(state, carrierId);
  if (!carrier?.cargo) return false;
  const cargo = carrier.cargo, request = (state.transportRequests ?? []).find((item) => item.id === cargo.requestId) ?? null, destination = getFlag(state, cargo.toFlagId);
  if (!request || !destination) return false;
  addCargoToFlag(state, destination.id, cargo.resourceId, cargo.amount);
  if (destination.id === request.destinationFlagId) {
    deliverFlagCargoToBuilding(state, destination.id, cargo.resourceId, cargo.amount);
    request.delivered += cargo.amount;
    if (request.delivered >= request.amount) request.state = 'delivered';
  }
  carrier.cargo = null; carrier.state = CARRIER_STATES.WAITING; return true;
}

export function advanceCarrier(state, carrierId, requestId) {
  const carrier = getCarrier(state, carrierId), request = (state.transportRequests ?? []).find((item) => item.id === requestId) ?? null;
  if (!carrier || !request) return false;
  return carrier.cargo ? deliverCarrierToFlag(state, carrierId) : loadCarrierFromFlag(state, carrierId, requestId);
}
