import { deliverMaterialToConstructionFlag } from './construction.js';

export function getConstructionStorage(state) {
  return [
    ...(state.buildings ?? []).filter((building) => building.active && ['headquarters', 'warehouse'].includes(building.typeId)),
  ];
}

export function getAvailableStoredResource(state, resourceId) {
  return getConstructionStorage(state).reduce((sum, building) => sum + Number(building.storage?.[resourceId] ?? 0), 0) + Number(state.player?.resources?.[resourceId] ?? 0);
}

export function deliverConstructionMaterial(state, buildingId, resourceId, amount = 1) {
  const building = (state.buildings ?? []).find((item) => item.id === buildingId);
  if (!building) throw new Error('Building not found');
  const available = Number(state.player?.resources?.[resourceId] ?? 0);
  const requested = Math.max(0, Math.floor(Number(amount) || 0));
  const deliverable = Math.min(requested, available);
  if (!deliverable) return 0;

  const delivered = deliverMaterialToConstructionFlag(state, building, resourceId, deliverable);
  if (delivered > 0) state.player.resources[resourceId] = available - delivered;
  return delivered;
}
