import { INFLUENCE_RADIUS, isWithinInfluenceRadius } from './influence.js';

export const WORKER_TYPES = {
  LUMBERJACK: {
    id: 'lumberjack',
    name: 'Лесоруб',
    resourceId: 'wood',
  },
  STONEMASON: {
    id: 'stonemason',
    name: 'Каменщик',
    resourceId: 'stone',
  },
  MINER: {
    id: 'miner',
    name: 'Шахтёр',
    resourceId: 'ore',
  },
};

export function createWorkZone(id, ownerId, centerTileId, workerTypeId) {
  return {
    id,
    ownerId,
    centerTileId,
    workerTypeId,
    radius: INFLUENCE_RADIUS,
    active: true,
  };
}

export function isTileInWorkZone(zone, centerTile, targetTile) {
  if (!zone.active) return false;
  return isWithinInfluenceRadius(centerTile, targetTile, zone.radius);
}

export function consumeResource(tile, resourceId, amount = 1) {
  const current = tile.resources?.[resourceId] ?? 0;
  if (current < amount) return false;
  tile.resources[resourceId] = current - amount;
  return true;
}

export function extractOneResource(tile, workerTypeId) {
  const worker = Object.values(WORKER_TYPES).find((item) => item.id === workerTypeId);
  if (!worker) return null;
  return consumeResource(tile, worker.resourceId, 1) ? worker.resourceId : null;
}
