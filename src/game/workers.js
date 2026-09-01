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
  const type = Object.values(WORKER_TYPES).find((item) => item.id === typeId);
  if (!type) throw new Error(`Unknown worker type: ${typeId}`);
  return { id, ownerId, typeId, state: 'idle', buildingId: null, zoneId: null, targetTileId: null };
}

export function createWorkZone(id, ownerId, centerTileId, radius = 5, buildingId = null) {
  return { id, ownerId, centerTileId, radius, buildingId, workerIds: [] };
}

function distance(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
export function isInsideWorkZone(center, tile, radius) { return distance(center, tile) <= radius; }

function getBuildingType(state, building) { return Object.values(state.buildingTypes ?? {}).find((item) => item.id === building.typeId) ?? null; }
function getWorkerZone(state, building) { return state.workZones?.find((item) => item.buildingId === building.id && item.active !== false) ?? null; }

function validateTargetTile(state, building, zone, targetTileId) {
  if (!targetTileId) return true;
  const target = state.tiles.find((tile) => tile.id === targetTileId);
  const center = state.tiles.find((tile) => tile.id === zone.centerTileId);
  if (!target || !center) return false;
  return isInsideWorkZone(center, target, zone.radius);
}

export function assignWorkerToBuilding(state, workerId, buildingId, targetTileId = null) {
  const worker = state.workers?.find((item) => item.id === workerId);
  const building = state.buildings?.find((item) => item.id === buildingId && item.active);
  if (!worker || !building) throw new Error('Worker or building not found');
  if (worker.ownerId !== building.ownerId) throw new Error('Worker and building owners differ');
  const buildingType = getBuildingType(state, building);
  if (!buildingType || buildingType.workerTypeId !== worker.typeId) throw new Error('Worker type is incompatible with building');
  const zone = getWorkerZone(state, building);
  if (!zone) throw new Error('Building has no work zone');
  if (!validateTargetTile(state, building, zone, targetTileId)) throw new Error('Target tile is outside work zone');
  if (!zone.workerIds.includes(workerId)) zone.workerIds.push(workerId);
  if (!building.workerIds.includes(workerId)) building.workerIds.push(workerId);
  worker.buildingId = buildingId;
  worker.zoneId = zone.id;
  worker.targetTileId = targetTileId;
  worker.state = 'working';
  return worker;
}

export function findAvailableResourceTile(state, worker) {
  const rule = RESOURCE_RULES[worker.typeId];
  const zone = state.workZones?.find((item) => item.id === worker.zoneId && item.active !== false);
  if (!rule || !zone || !worker.targetTileId) return null;
  const target = state.tiles.find((tile) => tile.id === worker.targetTileId);
  const center = state.tiles.find((tile) => tile.id === zone.centerTileId);
  if (!target || !center || !rule.terrainIds.includes(target.terrain)) return null;
  if ((target.resources?.[rule.resourceId] ?? 0) <= 0) return null;
  if (!isInsideWorkZone(center, target, zone.radius)) return null;
  return target;
}

function getMinerRule(state, worker) {
  const building = state.buildings?.find((item) => item.id === worker.buildingId && item.active);
  const type = building ? getBuildingType(state, building) : null;
  if (!type || worker.typeId !== 'miner' || type.role !== 'extraction') return null;
  const resourceId = type.output?.resourceId;
  if (!resourceId) return null;
  return { resourceId, terrainIds: ['hills', 'mountains'] };
}

export function extractForWorker(state, worker) {
  const rule = worker.typeId === 'miner' ? getMinerRule(state, worker) : RESOURCE_RULES[worker.typeId];
  const tile = findAvailableResourceTile(state, { ...worker, _resourceRule: rule });
  if (!rule || !tile) { worker.state = 'idle'; return { extracted: false, amount: 0, tileId: null }; }
  const amount = state.rules.resourceUnitPerExtraction;
  if ((tile.resources?.[rule.resourceId] ?? 0) < amount) { worker.state = 'idle'; return { extracted: false, amount: 0, tileId: tile.id }; }
  tile.resources[rule.resourceId] -= amount;
  state.player.resources[rule.resourceId] = (state.player.resources[rule.resourceId] ?? 0) + amount;
  worker.state = 'working';
  return { extracted: true, amount, tileId: tile.id };
}

export function workWorker(state, workerId) {
  const worker = state.workers?.find((item) => item.id === workerId);
  if (!worker) throw new Error('Worker not found');
  return extractForWorker(state, worker);
}

export function processWorkersTurn(state) {
  const results = (state.workers ?? []).map((worker) => workWorker(state, worker.id));
  state.turn += 1;
  return results;
}
