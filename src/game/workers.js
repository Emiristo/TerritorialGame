export const WORKER_TYPES = {
  LUMBERJACK: { id: 'lumberjack', name: 'Лесоруб', resourceId: 'wood', terrainId: 'forest' },
  STONEMASON: { id: 'stonemason', name: 'Каменщик', resourceId: 'stone', terrainId: 'hills' },
  MINER: { id: 'miner', name: 'Шахтёр', resourceId: 'ore', terrainId: 'mountains' },
};

export function createWorker(id, ownerId, typeId) {
  const type = Object.values(WORKER_TYPES).find((item) => item.id === typeId);
  if (!type) throw new Error(`Unknown worker type: ${typeId}`);
  return { id, ownerId, typeId, state: 'idle', zoneId: null, targetTileId: null };
}

export function createWorkZone(id, ownerId, centerTileId, radius = 5) {
  return { id, ownerId, centerTileId, radius, workerIds: [] };
}

function distance(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
export function isInsideWorkZone(center, tile, radius) { return distance(center, tile) <= radius; }

export function assignWorkerToZone(state, workerId, zoneId) {
  const worker = state.workers?.find((item) => item.id === workerId);
  const zone = state.workZones?.find((item) => item.id === zoneId);
  if (!worker || !zone) throw new Error('Worker or work zone not found');
  if (worker.ownerId !== zone.ownerId) throw new Error('Worker and work zone owners differ');
  if (!zone.workerIds.includes(workerId)) zone.workerIds.push(workerId);
  worker.zoneId = zoneId;
  worker.state = 'working';
  return worker;
}

export function findAvailableResourceTile(state, worker) {
  const type = Object.values(WORKER_TYPES).find((item) => item.id === worker.typeId);
  const zone = state.workZones?.find((item) => item.id === worker.zoneId);
  if (!type || !zone) return null;
  const center = state.tiles.find((tile) => tile.id === zone.centerTileId);
  if (!center) return null;
  return state.tiles.find((tile) => tile.ownerId === worker.ownerId && tile.terrain === type.terrainId && tile.resources?.[type.resourceId] > 0 && isInsideWorkZone(center, tile, zone.radius)) ?? null;
}

export function workWorker(state, workerId) {
  const worker = state.workers?.find((item) => item.id === workerId);
  if (!worker) throw new Error('Worker not found');
  const type = Object.values(WORKER_TYPES).find((item) => item.id === worker.typeId);
  const tile = findAvailableResourceTile(state, worker);
  if (!type || !tile) { worker.state = 'idle'; worker.targetTileId = null; return { worked: false, worker, tile: null, amount: 0 }; }
  const amount = state.rules.resourceUnitPerExtraction;
  tile.resources[type.resourceId] = Math.max(0, tile.resources[type.resourceId] - amount);
  state.player.resources[type.resourceId] += amount;
  worker.state = 'working';
  worker.targetTileId = tile.id;
  return { worked: true, worker, tile, amount };
}

export function processWorkersTurn(state) {
  const results = (state.workers ?? []).map((worker) => workWorker(state, worker.id));
  state.turn += 1;
  return results;
}
