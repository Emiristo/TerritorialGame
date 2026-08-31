import { RESOURCE_TYPES, hasResourceDeposit } from './resources.js';
import { INFLUENCE_RADIUS, isWithinInfluenceRadius } from './influence.js';

export const WORKER_TYPES = {
  LUMBERJACK: { id: 'lumberjack', name: 'Лесоруб', resourceId: RESOURCE_TYPES.WOOD.id },
  STONECUTTER: { id: 'stonecutter', name: 'Каменщик', resourceId: RESOURCE_TYPES.STONE.id },
  MINER: { id: 'miner', name: 'Шахтёр', resourceId: RESOURCE_TYPES.ORE.id },
};

export function createWorkZone(id, ownerId, centerTileId, radius = INFLUENCE_RADIUS) {
  return { id, ownerId, centerTileId, radius, active: true };
}

export function createWorker(id, ownerId, typeId) {
  const type = Object.values(WORKER_TYPES).find((item) => item.id === typeId);
  if (!type) throw new Error(`Неизвестный тип работника: ${typeId}`);
  return { id, ownerId, typeId, workZoneId: null, targetTileId: null, active: true };
}

export function assignWorkerToZone(state, workerId, workZoneId) {
  const worker = state.workers?.find((item) => item.id === workerId);
  const zone = state.workZones?.find((item) => item.id === workZoneId && item.active);
  if (!worker) throw new Error('Работник не найден.');
  if (!zone) throw new Error('Рабочая зона не найдена.');
  if (worker.ownerId !== zone.ownerId) throw new Error('Нельзя назначить работника чужой рабочей зоне.');
  worker.workZoneId = zone.id;
  worker.targetTileId = null;
  return worker;
}

function getWorkerType(worker) {
  return Object.values(WORKER_TYPES).find((type) => type.id === worker.typeId);
}

export function findAvailableResourceTile(state, worker) {
  const zone = state.workZones?.find((item) => item.id === worker.workZoneId && item.active);
  if (!zone) return null;
  const center = state.tiles.find((tile) => tile.id === zone.centerTileId);
  const type = getWorkerType(worker);
  if (!center || !type) return null;

  return state.tiles.find((tile) => (
    tile.ownerId === worker.ownerId
    && isWithinInfluenceRadius(center, tile, zone.radius)
    && hasResourceDeposit(tile, type.resourceId)
  )) ?? null;
}

export function extractForWorker(state, worker) {
  const type = getWorkerType(worker);
  if (!type) return { extracted: false, reason: 'unknown-worker' };
  const tile = findAvailableResourceTile(state, worker);
  if (!tile) return { extracted: false, reason: 'no-resource' };

  const amount = state.rules.resourceUnitPerExtraction;
  tile.resources[type.resourceId] = Math.max(0, tile.resources[type.resourceId] - amount);
  state.player.resources[type.resourceId] += amount;
  worker.targetTileId = tile.id;
  return { extracted: true, resourceId: type.resourceId, amount, tileId: tile.id };
}

export function processWorkersTurn(state) {
  return (state.workers ?? [])
    .filter((worker) => worker.active && worker.ownerId === state.player.id && worker.workZoneId)
    .map((worker) => extractForWorker(state, worker));
}
