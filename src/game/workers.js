import {
  assignWorkerToBuilding,
  assignWorkerToWorkZone,
  canWorkerUseWorkZone,
  createWorkZone,
  getWorkZoneForBuilding,
  removeWorkZoneForBuilding,
} from './workZones.js';
import {
  addCargoToFlag,
  getFlagCargo,
  getBuildingInputStorage,
  addInputResourceToBuilding,
  getBuildingOutputStorageResource,
  removeProductionOutputFromBuilding,
  removeCargoFromFlag,
} from './carriers.js';
import { findReservedInputSlot, occupyReservedInputSlot } from './inputReservations.js';
import { markLogisticsDirty } from './logisticsSignals.js';

export const WORKER_TYPES = {
  FORESTER: { id: 'forester', name: 'Лесничий', toolId: 'shovel' },
  STONEMASON: { id: 'stonemason', name: 'Каменщик', toolId: 'pickaxe' },
  LUMBERJACK: { id: 'lumberjack', name: 'Лесоруб', toolId: 'axe' },
  CARPENTER: { id: 'carpenter', name: 'Столяр', toolId: 'saw' },
  RESIDENT: { id: 'resident', name: 'Житель', toolId: null },
  MILLER: { id: 'miller', name: 'Мельник', toolId: 'bag' },
  BAKER: { id: 'baker', name: 'Пекарь', toolId: 'rolling_pin' },
  FARMER: { id: 'farmer', name: 'Фермер', toolId: 'scythe' },
  MINER: { id: 'miner', name: 'Шахтёр', toolId: 'pickaxe' },
  STEELWORKER: { id: 'steelworker', name: 'Сталевар', toolId: 'ladle' },
  BLACKSMITH: { id: 'blacksmith', name: 'Кузнец', toolId: 'hammer' },
  MASTER: { id: 'master', name: 'Мастер', toolId: 'tongs' },
  CARRIER: { id: 'carrier', name: 'Носильщик', toolId: null },
  SOLDIER: { id: 'soldier', name: 'Солдат', toolId: null },
};

const RESOURCE_RULES = {
  forester: { resourceId: 'wood', terrainIds: ['forest'] },
  stonemason: { resourceId: 'stone', terrainIds: ['plains'] },
  lumberjack: { resourceId: 'wood', terrainIds: ['forest'] },
};

export { assignWorkerToBuilding, assignWorkerToWorkZone, canWorkerUseWorkZone, createWorkZone, getWorkZoneForBuilding, removeWorkZoneForBuilding };

export function createWorker(id, ownerId, typeId) {
  return { id, ownerId, typeId, state: 'idle', buildingId: null, zoneId: null, targetTileId: null };
}

function findWorker(state, workerId) { return (state.workers ?? []).find((worker) => worker.id === workerId) ?? null; }
function findBuilding(state, buildingId) { return (state.buildings ?? []).find((building) => building.id === buildingId) ?? null; }
function findZone(state, zoneId) { return (state.workZones ?? []).find((zone) => zone.id === zoneId) ?? null; }
function getBuildingType(state, building) { return (state.buildingTypes ?? []).find((type) => type.id === building?.typeId) ?? null; }
export function getWorkerType(worker) { return Object.values(WORKER_TYPES).find((type) => type.id === worker?.typeId) ?? null; }

function getMapGeometry(state) {
  return state.worldMap?.geometry ?? null;
}

function getMapTiles(state) {
  return state.worldMap?.tiles ?? state.tiles ?? [];
}

function getTileById(state, tileId) {
  if (state.worldMap?.getWorldTileById) return state.worldMap.getWorldTileById(tileId);
  return getMapTiles(state).find((tile) => tile.id === tileId) ?? null;
}

export function getExtractionRule(state, worker) {
  if (worker?.typeId !== 'miner') return RESOURCE_RULES[worker?.typeId] ?? null;
  const zone = findZone(state, worker?.zoneId);
  const building = zone ? findBuilding(state, zone.buildingId) : null;
  const type = getBuildingType(state, building);
  if (!building || !building.active || type?.role !== 'extraction') return null;
  const resourceId = type.output?.resourceId;
  if (!resourceId) return null;
  return { resourceId, terrainIds: ['hills', 'mountains'] };
}

export function findAvailableResourceTile(state, worker) {
  const rule = getExtractionRule(state, worker);
  if (!rule || !worker?.zoneId) return null;
  const zone = findZone(state, worker.zoneId);
  if (!zone) return null;
  const center = getTileById(state, zone.centerTileId);
  if (!center) return null;
  const geometry = getMapGeometry(state);
  return getMapTiles(state).find((tile) => rule.terrainIds.includes(tile.terrain)
    && (tile.resources?.[rule.resourceId] ?? 0) > 0
    && (geometry
      ? geometry.distance(tile, center) <= zone.radius
      : Math.max(Math.abs(tile.x - center.x), Math.abs(tile.y - center.y)) <= zone.radius)) ?? null;
}

export function extractForWorker(state, workerId) {
  const worker = findWorker(state, workerId);
  const tile = worker?.targetTileId
    ? getTileById(state, worker.targetTileId)
    : findAvailableResourceTile(state, worker);
  const rule = worker ? getExtractionRule(state, worker) : null;
  const building = worker?.buildingId ? findBuilding(state, worker.buildingId) : null;
  const flag = building ? (state.flags ?? []).find((item) => item.buildingId === building.id) ?? null : null;
  if (!worker || !tile || !rule || !building || !flag) return false;
  const available = Number(tile.resources?.[rule.resourceId] ?? 0);
  if (available <= 0) return false;

  if (addCargoToFlag(state, flag.id, rule.resourceId, 1) !== 1) return false;
  tile.resources[rule.resourceId] = available - 1;
  worker.targetTileId = tile.id;
  markLogisticsDirty(state, building.id, rule.resourceId);
  return true;
}

export function workWorker(state, workerId) {
  const worker = findWorker(state, workerId);
  if (!worker || worker.state !== 'working') return false;
  const tile = findAvailableResourceTile(state, worker);
  if (!tile) return false;
  worker.targetTileId = tile.id;
  return extractForWorker(state, worker.id);
}

function getBuildingWorker(state, building) {
  return (state.workers ?? []).find((worker) => worker.buildingId === building.id
    && worker.ownerId === building.ownerId
    && worker.typeId === getBuildingType(state, building)?.workerTypeId) ?? null;
}

function completeProductionInputDelivery(state, building, resourceId) {
  const slotIndex = (state.transportRequests ?? [])
    .map((request) => ({ request, slot: Number(request.reservedInputSlot) }))
    .find(({ request, slot }) => request.state === 'at_destination'
      && request.destinationBuildingId === building.id
      && request.resourceId === resourceId
      && Number.isInteger(slot)
      && slot >= 0)?.slot ?? -1;
  if (slotIndex < 0) return false;
  const request = (state.transportRequests ?? []).find((item) => item.state === 'at_destination'
    && item.destinationBuildingId === building.id
    && item.resourceId === resourceId
    && Number(item.reservedInputSlot) === slotIndex) ?? null;
  if (!request) return false;
  if (!occupyReservedInputSlot(state, building.id, request.id, resourceId)) return false;
  request.reservedInputSlot = null;
  request.delivered = Number(request.delivered ?? 0) + 1;
  request.state = Number(request.delivered) >= Number(request.amount ?? 0) ? 'delivered' : 'at_destination';
  return true;
}

export function moveBuildingWorkerCargo(state, workerId) {
  const worker = findWorker(state, workerId);
  const building = worker?.buildingId ? findBuilding(state, worker.buildingId) : null;
  const type = getBuildingType(state, building);
  const flag = building ? (state.flags ?? []).find((item) => item.buildingId === building.id) : null;
  if (!worker || !building || !flag || worker.state !== 'working' || type?.role !== 'production') return false;

  const output = getBuildingOutputStorageResource(state, building.id);
  if (output != null) {
    if (removeProductionOutputFromBuilding(state, building.id, output, 1) !== 1) return false;
    if (addCargoToFlag(state, flag.id, output, 1) !== 1) return false;
    markLogisticsDirty(state, building.id, output);
    return true;
  }

  const slots = getBuildingInputStorage(state, building.id);
  if (slots.length >= 4 && slots.every(Boolean)) return false;
  for (const resourceId of Object.keys(type.input ?? {})) {
    if (getFlagCargo(state, flag.id, resourceId) <= 0) continue;
    const matchingRequest = (state.transportRequests ?? []).find((request) => request.state === 'at_destination'
      && request.destinationBuildingId === building.id
      && request.resourceId === resourceId
      && Number.isInteger(Number(request.reservedInputSlot)));
    if (!matchingRequest) continue;
    const slotIndex = Number(matchingRequest.reservedInputSlot);
    if (findReservedInputSlot(state, building.id, matchingRequest.id) !== slotIndex) continue;
    if (removeCargoFromFlag(state, flag.id, resourceId, 1) !== 1) continue;
    if (!occupyReservedInputSlot(state, building.id, matchingRequest.id, resourceId)) {
      addCargoToFlag(state, flag.id, resourceId, 1);
      continue;
    }
    matchingRequest.reservedInputSlot = null;
    matchingRequest.delivered = Number(matchingRequest.delivered ?? 0) + 1;
    matchingRequest.state = Number(matchingRequest.delivered) >= Number(matchingRequest.amount ?? 0) ? 'delivered' : 'at_destination';
    return true;
  }
  return false;
}

export function advanceBuildingWorkers(state) {
  let moved = 0;
  for (const building of state.buildings ?? []) {
    if (!building.active || !building.constructionComplete) continue;
    const type = getBuildingType(state, building);
    if (type?.role !== 'production') continue;
    const worker = getBuildingWorker(state, building);
    if (worker && moveBuildingWorkerCargo(state, worker.id)) moved += 1;
  }
  return moved;
}