import { deliverMaterialToConstructionFlag } from './construction.js';

export function getConstructionStorage(state) {
  return [
    ...(state.buildings ?? []).filter((building) => building.active && ['headquarters', 'warehouse'].includes(building.typeId)),
  ];
}

export function getAvailableStoredResource(state, resourceId) {
  return getConstructionStorage(state).reduce((sum, building) => sum + Number(building.storage?.[resourceId] ?? 0), 0);
}

export function deliverConstructionMaterial(state, buildingId, resourceId, amount = 1) {
  const building = (state.buildings ?? []).find((item) => item.id === buildingId);
  if (!building) throw new Error('Building not found');

  const requested = Math.max(0, Math.floor(Number(amount) || 0));
  if (!requested) return 0;

  let remaining = requested;
  let deliveredTotal = 0;

  for (const source of getConstructionStorage(state)) {
    if (remaining <= 0) break;

    const available = Number(source.storage?.[resourceId] ?? 0);
    if (available <= 0) continue;

    const units = Math.min(remaining, available);
    const delivered = deliverMaterialToConstructionFlag(state, building, resourceId, units);
    if (delivered <= 0) continue;

    source.storage[resourceId] = available - delivered;
    deliveredTotal += delivered;
    remaining -= delivered;
  }

  return deliveredTotal;
}
