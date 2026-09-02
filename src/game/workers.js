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
  SOLDIER: { id: 'soldier', name: 'Солдат', toolId: null },
};

const RESOURCE_RULES = {
  forester: { resourceId: 'wood', terrainIds: ['forest'] },
  stonemason: { resourceId: 'stone', terrainIds: ['plains'] },
  lumberjack: { resourceId: 'wood', terrainIds: ['forest'] },
};

export function createWorker(id, ownerId, typeId) {
  return { id, ownerId, typeId, state: 'idle', buildingId: null, zoneId: null, targetTileId: null };
}

export function createWorkZone(id, ownerId, centerTileId, radius, buildingId = null) {
  return { id, ownerId, centerTileId, radius, buildingId, workerIds: [] };
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

export function isWorkerTargetInZone(state, worker, tileId) {
  const zone = findZone(state, worker?.zoneId);
  const tile = (state.tiles ?? []).find((item) => item.id === tileId);
  const center = zone ? (state.tiles ?? []).find((item) => item.id === zone.centerTileId) : null;
  if (!zone || !tile || !center) return false;
  return Math.max(Math.abs(tile.x - center.x), Math.abs(tile.y - center.y)) <= zone.radius;
}

export function assignWorkerToBuilding(state, workerId, buildingId, zoneId, targetTileId = null) {
  const worker = findWorker(state, workerId);
  const building = findBuilding(state, buildingId);
  const zone = findZone(state, zoneId);
  const type = getBuildingType(state, building);
  if (!worker || !building || !zone || !type || !building.active || !building.constructionComplete) return false;
  if (worker.ownerId !== building.ownerId || worker.typeId !== type.workerTypeId) return false;
  if (zone.buildingId !== building.id || zone.ownerId !== building.ownerId) return false;
  if (targetTileId != null && !isWorkerTargetInZone(state, worker, targetTileId)) return false;
  if (worker.buildingId && worker.buildingId !== building.id) {
    const oldBuilding = findBuilding(state, worker.buildingId);
    if (oldBuilding) oldBuilding.workerIds = (oldBuilding.workerIds ?? []).filter((id) => id !== worker.id);
  }
  for (const otherZone of state.workZones ?? []) otherZone.workerIds = (otherZone.workerIds ?? []).filter((id) => id !== worker.id);
  worker.buildingId = building.id;
  worker.zoneId = zone.id;
  worker.targetTileId = targetTileId;
  worker.state = 'working';
  building.workerIds ??= [];
  if (!building.workerIds.includes(worker.id)) building.workerIds.push(worker.id);
  zone.workerIds ??= [];
  if (!zone.workerIds.includes(worker.id)) zone.workerIds.push(worker.id);
  return true;
}

export function findAvailableResourceTile(state, worker) {
  const rule = getExtractionRule(state, worker);
  if (!rule || !worker?.zoneId) return null;
  const zone = findZone(state, worker.zoneId);
  if (!zone) return null;
  return (state.tiles ?? []).find((tile) => rule.terrainIds.includes(tile.terrain)
    && (tile.resources?.[rule.resourceId] ?? 0) > 0
    && isWorkerTargetInZone(state, worker, tile.id)) ?? null;
}

export function extractForWorker(state, workerId) {
  const worker = findWorker(state, workerId);
  const tile = worker?.targetTileId ? (state.tiles ?? []).find((item) => item.id === worker.targetTileId) : findAvailableResourceTile(state, worker);
  const rule = worker ? getExtractionRule(state, worker) : null;
  if (!worker || !tile || !rule || !isWorkerTargetInZone(state, worker, tile.id)) return false;
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

export function processWorkersTurn(state) {
  for (const worker of state.workers ?? []) workWorker(state, worker.id);
  state.turn += 1;
  return state;
}
