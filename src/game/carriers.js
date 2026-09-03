import { areFlagsConnected, findFlagRoute } from './logisticsNetwork.js';

export const CARRIER_STATES = Object.freeze({
  IDLE: 'idle',
  WAITING: 'waiting',
  CARRYING: 'carrying',
});

function getFlag(state, flagId) {
  return (state.flags ?? []).find((flag) => flag.id === flagId) ?? null;
}

function getRoad(state, roadId) {
  return (state.roads ?? []).find((road) => road.id === roadId && road.active) ?? null;
}

function getCarrier(state, carrierId) {
  return (state.carriers ?? []).find((carrier) => carrier.id === carrierId) ?? null;
}

function getRoadEndpoints(road) {
  return [road.startFlagId, road.endFlagId];
}

function ensureFlagCargo(flag) {
  flag.cargo ??= {};
  return flag.cargo;
}

export function createCarrier(id, ownerId, roadId = null) {
  return {
    id,
    ownerId,
    typeId: 'carrier',
    state: roadId ? CARRIER_STATES.WAITING : CARRIER_STATES.IDLE,
    roadId,
    cargo: null,
  };
}

export function createTransportRequest(id, ownerId, resourceId, amount, sourceFlagId, destinationFlagId) {
  return {
    id,
    ownerId,
    resourceId,
    amount: Math.max(0, Math.floor(Number(amount) || 0)),
    delivered: 0,
    sourceFlagId,
    destinationFlagId,
    routeFlagIds: [],
    state: 'waiting',
  };
}

export function addCarrier(state, carrier) {
  state.carriers ??= [];
  if (state.carriers.some((item) => item.id === carrier.id)) throw new Error(`Carrier already exists: ${carrier.id}`);
  if (carrier.roadId && state.carriers.some((item) => item.roadId === carrier.roadId)) {
    throw new Error('Road segment already has a carrier');
  }
  const road = carrier.roadId ? getRoad(state, carrier.roadId) : null;
  if (carrier.roadId && !road) throw new Error('Carrier road does not exist');
  state.carriers.push(carrier);
  return carrier;
}

export function assignCarrierToRoad(state, carrierId, roadId) {
  const carrier = getCarrier(state, carrierId);
  const road = getRoad(state, roadId);
  if (!carrier || !road || carrier.cargo) return false;
  const occupied = (state.carriers ?? []).some((item) => item.id !== carrierId && item.roadId === roadId);
  if (occupied) return false;
  carrier.roadId = roadId;
  carrier.state = CARRIER_STATES.WAITING;
  return true;
}

export function removeCarrierFromRoad(state, carrierId) {
  const carrier = getCarrier(state, carrierId);
  if (!carrier || carrier.cargo) return false;
  carrier.roadId = null;
  carrier.state = CARRIER_STATES.IDLE;
  return true;
}

export function getCarrierRoad(state, carrierId) {
  const carrier = getCarrier(state, carrierId);
  return carrier?.roadId ? getRoad(state, carrier.roadId) : null;
}

export function addCargoToFlag(state, flagId, resourceId, amount = 1) {
  const flag = getFlag(state, flagId);
  const units = Math.max(0, Math.floor(Number(amount) || 0));
  if (!flag || !resourceId || units <= 0) return 0;
  const cargo = ensureFlagCargo(flag);
  cargo[resourceId] = Number(cargo[resourceId] ?? 0) + units;
  return units;
}

export function getFlagCargo(state, flagId, resourceId) {
  const flag = getFlag(state, flagId);
  return Number(flag?.cargo?.[resourceId] ?? 0);
}

export function removeCargoFromFlag(state, flagId, resourceId, amount = 1) {
  const flag = getFlag(state, flagId);
  const available = getFlagCargo(state, flagId, resourceId);
  const units = Math.max(0, Math.min(Math.floor(Number(amount) || 0), available));
  if (!flag || units <= 0) return 0;
  flag.cargo[resourceId] = available - units;
  return units;
}

export function prepareTransportRequest(state, request) {
  if (!request || request.amount <= request.delivered) return false;
  if (!getFlag(state, request.sourceFlagId) || !getFlag(state, request.destinationFlagId)) return false;
  if (!areFlagsConnected(state, request.sourceFlagId, request.destinationFlagId)) return false;
  const route = findFlagRoute(state, request.sourceFlagId, request.destinationFlagId);
  if (!route || route.length < 2) return false;
  request.routeFlagIds = route;
  request.state = 'ready';
  return true;
}

export function loadCarrierFromFlag(state, carrierId, requestId) {
  const carrier = getCarrier(state, carrierId);
  const request = (state.transportRequests ?? []).find((item) => item.id === requestId) ?? null;
  const road = getCarrierRoad(state, carrierId);
  if (!carrier || !request || !road || carrier.cargo) return false;
  if (!prepareTransportRequest(state, request)) return false;
  const fromFlagId = request.routeFlagIds[request.routeFlagIds.indexOf(road.startFlagId)] === road.startFlagId
    ? road.startFlagId
    : road.endFlagId;
  const routeIndex = request.routeFlagIds.indexOf(fromFlagId);
  if (routeIndex < 0 || routeIndex >= request.routeFlagIds.length - 1) return false;
  const nextFlagId = request.routeFlagIds[routeIndex + 1];
  if (![road.startFlagId, road.endFlagId].includes(nextFlagId)) return false;
  if (!removeCargoFromFlag(state, fromFlagId, request.resourceId, 1)) return false;
  carrier.cargo = {
    requestId: request.id,
    resourceId: request.resourceId,
    amount: 1,
    fromFlagId,
    toFlagId: nextFlagId,
  };
  carrier.state = CARRIER_STATES.CARRYING;
  return true;
}

export function deliverCarrierToFlag(state, carrierId) {
  const carrier = getCarrier(state, carrierId);
  if (!carrier?.cargo) return false;
  const cargo = carrier.cargo;
  const request = (state.transportRequests ?? []).find((item) => item.id === cargo.requestId) ?? null;
  const destination = getFlag(state, cargo.toFlagId);
  if (!request || !destination) return false;
  addCargoToFlag(state, destination.id, cargo.resourceId, cargo.amount);
  request.delivered += cargo.amount;
  carrier.cargo = null;
  carrier.state = CARRIER_STATES.WAITING;
  if (request.delivered >= request.amount) request.state = 'delivered';
  return true;
}

export function advanceCarrier(state, carrierId, requestId) {
  const carrier = getCarrier(state, carrierId);
  const request = (state.transportRequests ?? []).find((item) => item.id === requestId) ?? null;
  if (!carrier || !request) return false;
  if (!carrier.cargo) return loadCarrierFromFlag(state, carrierId, requestId);
  return deliverCarrierToFlag(state, carrierId);
}
