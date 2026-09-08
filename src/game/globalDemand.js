import { BUILDING_TYPES } from './buildings.js';
import { getFreeInputSlotCount } from './inputReservations.js';

function getBuildingType(state, building) {
  return (state.buildingTypes ?? []).find((type) => type.id === building?.typeId)
    ?? Object.values(BUILDING_TYPES).find((type) => type.id === building?.typeId)
    ?? null;
}

function ensureDemand(state) {
  if (!state.globalDemand || typeof state.globalDemand !== 'object') state.globalDemand = {};
  return state.globalDemand;
}

export function rebuildGlobalDemand(state) {
  const demand = {};

  for (const building of state.buildings ?? []) {
    if (!building?.active) continue;
    const type = getBuildingType(state, building);
    if (type?.role !== 'production') continue;

    for (const resourceId of Object.keys(type.input ?? {})) {
      const amount = Math.max(0, getFreeInputSlotCount(state, building.id));
      if (amount <= 0) continue;
      demand[resourceId] ??= [];
      demand[resourceId].push({
        buildingId: building.id,
        ownerId: building.ownerId,
        resourceId,
        amount,
      });
    }
  }

  state.globalDemand = demand;
  return demand;
}

export function getGlobalDemand(state, resourceId) {
  return (ensureDemand(state)[resourceId] ?? []).filter((entry) => Number(entry.amount ?? 0) > 0);
}

export function reserveGlobalDemand(state, resourceId, buildingId, amount = 1) {
  const entry = getGlobalDemand(state, resourceId).find((item) => item.buildingId === buildingId);
  if (!entry || Number(entry.amount ?? 0) < amount) return false;
  entry.amount = Number(entry.amount) - amount;
  return true;
}

export function releaseGlobalDemand(state, resourceId, buildingId, amount = 1) {
  const entry = getGlobalDemand(state, resourceId).find((item) => item.buildingId === buildingId);
  if (!entry) return false;
  entry.amount = Number(entry.amount ?? 0) + amount;
  return true;
}
