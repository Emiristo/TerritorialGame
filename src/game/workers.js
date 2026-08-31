export const WORKER_TYPES = {
  LUMBERJACK: { id: 'lumberjack', name: 'Лесоруб', resourceId: 'wood', terrainId: 'forest' },
  STONEMASON: { id: 'stonemason', name: 'Каменщик', resourceId: 'stone', terrainId: 'hills' },
  MINER: { id: 'miner', name: 'Шахтёр', resourceId: 'ore', terrainId: 'mountains' },
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

export function assignWorkerToBuilding(state, workerId, buildingId) {
  const worker = state.workers?.find((item) => item.id === workerId);
  const building = state.buildings?.find((item) => item.id === buildingId && item.active);
  if (!worker || !building) throw new Error('Worker or building not found');
  if (worker.ownerId !== building.ownerId) throw new Error('Worker and building owners differ');
  const buildingType = state.buildingTypes?.find((item) => item.id === building.typeId);
  const workerType = WORKER_TYPES[Object.keys(WORKER_TYPES).find((key) => WORKER_TYPES[key].id === worker.typeId)];
  if (!buildingType || !workerType || buildingType.workerTypeId !== worker.typeId) {
    throw new Error('Worker type is incompatible with building');
  }
  const zone = state.workZones?.find((item) => item.buildingId === buildingId && item.active !== false);
  if (!zone) throw new Error('Building has no work zone');
  if (!zone.workerIds.includes(workerId)) zone.workerIds.push(workerId);
  if (!building.workerIds.includes(workerId)) building.workerIds.push(workerId);
  worker.buildingId = buildingId;
  worker.zoneId = zone.id;
  worker.state = 'working';
  return worker;
}

export function assignWorkerToZone(state, workerId, zoneId) {
  const zone = state.workZones?.find((item) => item.id === zoneId);
  if (zone?.buildingId) return assignWorkerToBuilding(state, workerId, zone.buildingId);
  const worker = state.workers?.find((item) => item.id === workerId);
  if (!worker || !zone) throw new Error('Worker or work zone not found');
  if (worker.ownerId !== zone.ownerId) throw new Error('Worker and work zone owners differ');
  if (!zone.workerIds.includes(workerId)) zone.workerIds.push(workerId);
  worker.zoneId = zoneId;
  worker.state = 'working';
  return worker;
}

export function findAvailableResourceTile(state, worker) {
  const type = Object.values(WORKER_TYPES).find((item) => item.id === worker.typeId);
  const zone = state.workZones?.find((item) => item.id === worker.zoneId && item.active !== false);
  if (!type || !zone) return null;
  const center = state.tiles.find((tile) => tile.id === zone.centerTileId);
  if (!center) return null;
  return state.tiles.find((tile) => tile.ownerId === worker.ownerId && tile.terrain === type.terrainId && tile.resources?.[type.resourceId] > 0 && isInsideWorkZone(center, tile, zone.radius)) ?? null;
}

export function extractForWorker(state, worker) {
  const type = Object.values(WORKER_TYPES).find((item) => item.id === worker.typeId);
  const tile = findAvailableResourceTile(state, worker);
  if (!type || !tile) return { extracted: false, amount: 0, tileId: null };
  const amount = state.rules.resourceUnitPerExtraction;
  if (tile.resources[type.resourceId] < amount) return { extracted: false, amount: 0, tileId: null };
  tile.resources[type.resourceId] -= amount;
  state.player.resources[type.resourceId] += amount;
  worker.targetTileId = tile.id;
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
