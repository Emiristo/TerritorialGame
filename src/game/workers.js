import {
  assignWorkerToBuilding,
  assignWorkerToWorkZone,
  canWorkerUseWorkZone,
  createWorkZone,
  getWorkZoneForBuilding,
  removeWorkZoneForBuilding,
} from './workZones.js';

export const WORKER_TYPES = {
  FORESTER: { id: 'forester', name: 'Лесничий', toolId: 'shovel' },
  STONEMASON: { id: 'stonemason', name: 'Каменщик', toolId: 'pickaxe' },
  LUMBERJACK: { id: 'lumberjack', name: 'Лесоруб', toolId: 'axe' },
  CARPENTER: { id: 'carpenter', name: 'Столяр', toolId: 'saw' },
  RESIDENT: { id: 'resident', name: 'Житель', toolId: null },
  FARMER: { id: 'farmer', name: 'Фермер', toolId: 'scythe' },
  MILLER: { id: 'miller', name: 'Мельник', toolId: 'bag' },
  BAKER: { id: 'baker', name: 'Пекарь', toolId: 'rolling_pin' },
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
  const center = (state.tiles ?? []).find((item) => item.id === zone.centerTileId);
  if (!center) return null;
  return (state.tiles ?? []).find((tile) => rule.terrainIds.includes(tile.terrain)
    && (tile.resources?.[rule.resourceId] ?? 0) > 0
    && Math.max(Math.abs(tile.x - center.x), Math.abs(tile.y - center.y)) <= zone.radius) ?? null;
}

export function extractForWorker(state, workerId) {
  const worker = findWorker(state, workerId);
  const tile = worker?.targetTileId
    ? (state.tiles ?? []).find((item) => item.id === worker.targetTileId)
    : findAvailableResourceTile(state, worker);
  const rule = worker ? getExtractionRule(state, worker) : null;
  if (!worker || !tile || !rule) return false;
  const available = Number(tile.resources?.[rule.resourceId] ?? 0);
  if (available <= 0) return false;
  tile.resources[rule.resourceId] = available - 1;
  state.player.resources[rule.resourceId] = (state.player.resources[rule.resourceId] ?? 0) + 1;
  worker.targetTileId = tile.id;
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
