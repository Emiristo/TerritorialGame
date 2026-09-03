import { findFlagRoute } from './logisticsNetwork.js';
import { getRoadCarrierCapacity, recordRoadCargo } from './roads.js';

export const CARRIER_STATES = Object.freeze({ IDLE: 'idle', WAITING: 'waiting', CARRYING: 'carrying' });
export const CARRIER_ROLES = Object.freeze({ ROAD: 'road', WAREHOUSE: 'warehouse' });
export const BUILDING_INPUT_STORAGE_CAPACITY = 5;

function getFlag(state, flagId) { return (state.flags ?? []).find((flag) => flag.id === flagId) ?? null; }
function getRoad(state, roadId) { return (state.roads ?? []).find((road) => road.id === roadId && road.active) ?? null; }
function getCarrier(state, carrierId) { return (state.carriers ?? []).find((carrier) => carrier.id === carrierId) ?? null; }
function getBuilding(state, buildingId) { return (state.buildings ?? []).find((building) => building.id === buildingId) ?? null; }
function getBuildingType(state, building) { return (state.buildingTypes ?? []).find((type) => type.id === building?.typeId) ?? null; }
function ensureFlagCargo(flag) { flag.cargo ??= {}; return flag.cargo; }
function ensureBuildingInventory(building) { building.inventory ??= {}; return building.inventory; }
function ensureInputStorage(building) { building.inputStorageSlots ??= Array(BUILDING_INPUT_STORAGE_CAPACITY).fill(null); return building.inputStorageSlots; }
function carrierCountOnRoad(state, roadId, excludeCarrierId = null) { return (state.carriers ?? []).filter((item) => item.roadId === roadId && item.id !== excludeCarrierId && item.role !== CARRIER_ROLES.WAREHOUSE).length; }

export function createCarrier(id, ownerId, roadId = null) { return { id, ownerId, typeId: 'carrier', role: CARRIER_ROLES.ROAD, state: roadId ? CARRIER_STATES.WAITING : CARRIER_STATES.IDLE, roadId, buildingId: null, cargo: null }; }
export function createWarehouseCarrier(id, ownerId, buildingId) { return { id, ownerId, typeId: 'carrier', role: CARRIER_ROLES.WAREHOUSE, state: CARRIER_STATES.IDLE, roadId: null, buildingId, cargo: null }; }
export function createTransportRequest(id, ownerId, resourceId, amount, sourceFlagId, destinationFlagId) { return { id, ownerId, resourceId, amount: Math.max(0, Math.floor(Number(amount) || 0)), delivered: 0, inTransit: 0, sourceFlagId, destinationFlagId, routeFlagIds: [], routeRoadIds: [], state: 'waiting' }; }
export function createBuildingTransportRequest(state, id, ownerId, resourceId, amount, sourceBuildingId, destinationBuildingId) { const sourceFlag = (state.flags ?? []).find((flag) => flag.buildingId === sourceBuildingId) ?? null, destinationFlag = (state.flags ?? []).find((flag) => flag.buildingId === destinationBuildingId) ?? null; if (!sourceFlag || !destinationFlag) return null; const request = createTransportRequest(id, ownerId, resourceId, amount, sourceFlag.id, destinationFlag.id); request.sourceBuildingId = sourceBuildingId; request.destinationBuildingId = destinationBuildingId; return request; }
export function createWarehouseTransportRequest(state, id, ownerId, resourceId, amount, warehouseBuildingId, destinationBuildingId) { const request = createBuildingTransportRequest(state, id, ownerId, resourceId, amount, warehouseBuildingId, destinationBuildingId); if (!request) return null; request.sourceWarehouseId = warehouseBuildingId; return request; }
export function createProductionToWarehouseTransportRequest(state, id, ownerId, resourceId, amount, sourceBuildingId, warehouseBuildingId) { const request = createBuildingTransportRequest(state, id, ownerId, resourceId, amount, sourceBuildingId, warehouseBuildingId); if (!request) return null; request.destinationWarehouseId = warehouseBuildingId; return request; }
export function addCarrier(state, carrier) { state.carriers ??= []; if (state.carriers.some((item) => item.id === carrier.id)) throw new Error(`Carrier already exists: ${carrier.id}`); if (carrier.role === CARRIER_ROLES.ROAD && carrier.roadId && !getRoad(state, carrier.roadId)) throw new Error('Carrier road does not exist'); if (carrier.role === CARRIER_ROLES.ROAD && carrier.roadId && carrierCountOnRoad(state, carrier.roadId) >= getRoadCarrierCapacity(state, carrier.roadId)) throw new Error('Road has reached its carrier capacity'); state.carriers.push(carrier); return carrier; }
export function assignCarrierToRoad(state, carrierId, roadId) { const carrier = getCarrier(state, carrierId), road = getRoad(state, roadId); if (!carrier || carrier.role !== CARRIER_ROLES.ROAD || !road || carrier.cargo) return false; if (carrierCountOnRoad(state, roadId, carrierId) >= getRoadCarrierCapacity(state, roadId)) return false; carrier.roadId = roadId; carrier.state = CARRIER_STATES.WAITING; return true; }
export function removeCarrierFromRoad(state, carrierId) { const carrier = getCarrier(state, carrierId); if (!carrier || carrier.role !== CARRIER_ROLES.ROAD || carrier.cargo) return false; carrier.roadId = null; carrier.state = CARRIER_STATES.IDLE; return true; }
export function getCarrierRoad(state, carrierId) { const carrier = getCarrier(state, carrierId); return carrier?.roadId ? getRoad(state, carrier.roadId) : null; }
export function getWarehouseCarrier(state, warehouseBuildingId) { const warehouse = getBuilding(state, warehouseBuildingId); if (!warehouse) return null; const existing = (state.carriers ?? []).find((carrier) => carrier.role === CARRIER_ROLES.WAREHOUSE && carrier.buildingId === warehouseBuildingId); if (existing) return existing; const carrier = createWarehouseCarrier(`warehouse-carrier-${warehouseBuildingId}`, warehouse.ownerId, warehouseBuildingId); addCarrier(state, carrier); warehouse.warehouseCarrierId = carrier.id; return carrier; }
export function addCargoToFlag(state, flagId, resourceId, amount = 1) { const flag = getFlag(state, flagId), units = Math.max(0, Math.floor(Number(amount) || 0)); if (!flag || !resourceId || units <= 0) return 0; const cargo = ensureFlagCargo(flag); cargo[resourceId] = Number(cargo[resourceId] ?? 0) + units; return units; }
export function getFlagCargo(state, flagId, resourceId) { return Number(getFlag(state, flagId)?.cargo?.[resourceId] ?? 0); }
export function removeCargoFromFlag(state, flagId, resourceId, amount = 1) { const flag = getFlag(state, flagId), available = getFlagCargo(state, flagId, resourceId); const units = Math.max(0, Math.min(Math.floor(Number(amount) || 0), available)); if (!flag || units <= 0) return 0; flag.cargo[resourceId] = available - units; return units; }
export function addInventoryToBuilding(state, buildingId, resourceId, amount = 1) { const building = getBuilding(state, buildingId), units = Math.max(0, Math.floor(Number(amount) || 0)); if (!building || !resourceId || units <= 0) return 0; const inventory = ensureBuildingInventory(building); inventory[resourceId] = Number(inventory[resourceId] ?? 0) + units; return units; }
export function getBuildingInventory(state, buildingId, resourceId) { return Number(getBuilding(state, buildingId)?.inventory?.[resourceId] ?? 0); }
export function removeInventoryFromBuilding(state, buildingId, resourceId, amount = 1) { const building = getBuilding(state, buildingId), available = getBuildingInventory(state, buildingId, resourceId); const units = Math.max(0, Math.min(Math.floor(Number(amount) || 0), available)); if (!building || units <= 0) return 0; building.inventory[resourceId] = available - units; return units; }

export function getBuildingInputStorage(state, buildingId) { const building = getBuilding(state, buildingId); return building ? ensureInputStorage(building) : []; }
export function getBuildingInputStorageCapacity() { return BUILDING_INPUT_STORAGE_CAPACITY; }
export function getBuildingInputStorageCount(state, buildingId) { return getBuildingInputStorage(state, buildingId).filter(Boolean).length; }
export function getBuildingInputStorageResource(state, buildingId) { return getBuildingInputStorage(state, buildingId).find(Boolean) ?? null; }
export function addInputResourceToBuilding(state, buildingId, resourceId, amount = 1) {
  const building = getBuilding(state, buildingId), units = Math.max(0, Math.floor(Number(amount) || 0));
  if (!building || !resourceId || units <= 0) return 0;
  const type = getBuildingType(state, building);
  if (!type?.input?.[resourceId]) return 0;
  const slots = ensureInputStorage(building);
  let added = 0;
  for (let i = 0; i < slots.length && added < units; i += 1) {
    if (slots[i] === null) { slots[i] = resourceId; added += 1; }
  }
  return added;
}
export function removeInputResourceFromBuilding(state, buildingId, resourceId, amount = 1) {
  const building = getBuilding(state, buildingId), slots = building ? ensureInputStorage(building) : [];
  const units = Math.max(0, Math.floor(Number(amount) || 0));
  if (!building || !resourceId || units <= 0) return 0;
  let removed = 0;
  for (let i = 0; i < slots.length && removed < units; i += 1) {
    if (slots[i] === resourceId) { slots[i] = null; removed += 1; }
  }
  return removed;
}

export function stageBuildingOutputAtFlag(state, buildingId, resourceId, amount = 1) { const flag = (state.flags ?? []).find((item) => item.buildingId === buildingId) ?? null; const units = removeInventoryFromBuilding(state, buildingId, resourceId, amount); if (!flag || units <= 0) { if (units > 0) addInventoryToBuilding(state, buildingId, resourceId, units); return 0; } return addCargoToFlag(state, flag.id, resourceId, units); }
export function deliverFlagCargoToBuilding(state, flagId, resourceId, amount = 1) { const units = removeCargoFromFlag(state, flagId, resourceId, amount); if (units <= 0) return 0; const flag = getFlag(state, flagId); const added = flag?.buildingId ? addInputResourceToBuilding(state, flag.buildingId, resourceId, units) : 0; if (added < units) addCargoToFlag(state, flagId, resourceId, units - added); return added; }

export function stageWarehouseCargoForRequest(state, requestId) { const request = (state.transportRequests ?? []).find((item) => item.id === requestId) ?? null; if (!request || !request.sourceWarehouseId || request.state !== 'waiting' || Number(request.delivered ?? 0) + Number(request.inTransit ?? 0) >= Number(request.amount ?? 0)) return false; const carrier = getWarehouseCarrier(state, request.sourceWarehouseId); if (!carrier || carrier.cargo) return false; if (getBuildingInventory(state, request.sourceWarehouseId, request.resourceId) < 1) return false; if (!prepareTransportRequest(state, request)) return false; if (removeInventoryFromBuilding(state, request.sourceWarehouseId, request.resourceId, 1) !== 1) return false; if (addCargoToFlag(state, request.sourceFlagId, request.resourceId, 1) !== 1) return false; request.state = 'ready'; request.sourceStaged = true; carrier.cargo = { requestId, resourceId: request.resourceId, amount: 1, fromBuildingId: request.sourceWarehouseId, toFlagId: request.sourceFlagId }; carrier.state = CARRIER_STATES.CARRYING; return true; }
export function completeWarehousePickup(state, requestId) { const request = (state.transportRequests ?? []).find((item) => item.id === requestId) ?? null; const carrier = (state.carriers ?? []).find((item) => item.role === CARRIER_ROLES.WAREHOUSE && item.cargo?.requestId === requestId) ?? null; if (!request || !carrier) return false; carrier.cargo = null; carrier.state = CARRIER_STATES.IDLE; return true; }
export function prepareTransportRequest(state, request) { const delivered = Number(request?.delivered ?? 0), inTransit = Number(request?.inTransit ?? 0), amount = Number(request?.amount ?? 0); if (!request || delivered + inTransit >= amount || request.ownerId !== state.player?.id) return false; if (!getFlag(state, request.sourceFlagId) || !getFlag(state, request.destinationFlagId)) return false; const route = findFlagRoute(state, request.sourceFlagId, request.destinationFlagId); if (!route || route.flagIds.length < 2) return false; request.routeFlagIds = route.flagIds; request.routeRoadIds = route.roadIds; if (request.state === 'waiting') request.state = 'ready'; return true; }
function getSegmentForRoad(request, road) { const index = (request.routeRoadIds ?? []).indexOf(road.id); if (index < 0) return null; return { index, fromFlagId: request.routeFlagIds[index], toFlagId: request.routeFlagIds[index + 1] }; }
export function loadCarrierFromFlag(state, carrierId, requestId) { const carrier = getCarrier(state, carrierId), request = (state.transportRequests ?? []).find((item) => item.id === requestId) ?? null, road = getCarrierRoad(state, carrierId); if (!carrier || carrier.role !== CARRIER_ROLES.ROAD || !request || !road || carrier.cargo || carrier.ownerId !== request.ownerId) return false; if (!prepareTransportRequest(state, request)) return false; const segment = getSegmentForRoad(request, road); if (!segment || segment.index >= request.routeRoadIds.length) return false; if (!removeCargoFromFlag(state, segment.fromFlagId, request.resourceId, 1)) return false; request.inTransit = Number(request.inTransit ?? 0) + 1; carrier.cargo = { requestId: request.id, resourceId: request.resourceId, amount: 1, fromFlagId: segment.fromFlagId, toFlagId: segment.toFlagId, roadId: road.id }; carrier.state = CARRIER_STATES.CARRYING; return true; }
export function deliverCarrierToFlag(state, carrierId) {
  const carrier = getCarrier(state, carrierId);
  if (!carrier?.cargo || carrier.role !== CARRIER_ROLES.ROAD) return false;
  const cargo = carrier.cargo;
  const request = (state.transportRequests ?? []).find((item) => item.id === cargo.requestId) ?? null;
  const destination = getFlag(state, cargo.toFlagId);
  if (!request || !destination) return false;

  if (destination.id === request.destinationFlagId && request.destinationWarehouseId) {
    addInventoryToBuilding(state, request.destinationWarehouseId, cargo.resourceId, cargo.amount);
    request.delivered = Number(request.delivered ?? 0) + cargo.amount;
    request.inTransit = Math.max(0, Number(request.inTransit ?? 0) - cargo.amount);
    recordRoadCargo(state, cargo.roadId, cargo.amount);
    if (request.delivered >= request.amount) request.state = 'delivered';
  } else {
    addCargoToFlag(state, destination.id, cargo.resourceId, cargo.amount);
    request.inTransit = Math.max(0, Number(request.inTransit ?? 0) - cargo.amount);
    recordRoadCargo(state, cargo.roadId, cargo.amount);
    if (destination.id === request.destinationFlagId) {
      if (request.destinationBuildingId) request.state = 'at_destination';
      else {
        request.delivered = Number(request.delivered ?? 0) + cargo.amount;
        if (request.delivered >= request.amount) request.state = 'delivered';
      }
    }
  }

  carrier.cargo = null;
  carrier.state = CARRIER_STATES.WAITING;
  return true;
}
export function advanceCarrier(state, carrierId, requestId) { const carrier = getCarrier(state, carrierId), request = (state.transportRequests ?? []).find((item) => item.id === requestId) ?? null; if (!carrier || !request) return false; return carrier.cargo ? (carrier.role === CARRIER_ROLES.ROAD ? deliverCarrierToFlag(state, carrierId) : completeWarehousePickup(state, requestId)) : loadCarrierFromFlag(state, carrierId, requestId); }
