import { BUILDING_TYPES } from './buildings.js';
import { INPUT_SLOT_CAPACITY, getInputSlotReservations } from './inputReservations.js';

function getBuildingType(state, building) {
  return (state.buildingTypes ?? []).find((type) => type.id === building?.typeId)
    ?? Object.values(BUILDING_TYPES).find((type) => type.id === building?.typeId)
    ?? null;
}

function ensureDemand(state) {
  if (!state.globalDemand || typeof state.globalDemand !== 'object') state.globalDemand = {};
  return state.globalDemand;
}

function getStoredInputCount(building, resourceId) {
  return (building?.inputStorageSlots ?? []).filter((resource) => resource === resourceId).length;
}

function getReservedInputCount(state, buildingId, resourceId) {
  return getInputSlotReservations(state, buildingId)
    .filter((reservation) => reservation?.resourceId === resourceId).length;
}

export function rebuildGlobalDemand(state) {
  const demand = {};

  for (const building of state.buildings ?? []) {
    if (!building?.active) continue;
    const type = getBuildingType(state, building);
    if (type?.role !== 'production') continue;

    const input = type.input ?? {};
    const totalRecipeInputs = Object.values(input)
      .reduce((sum, amount) => sum + Math.max(0, Number(amount ?? 0)), 0);
    if (totalRecipeInputs <= 0) continue;

    const recipeCapacity = Math.floor(INPUT_SLOT_CAPACITY / totalRecipeInputs);

    for (const [resourceId, requiredValue] of Object.entries(input)) {
      const requiredPerCycle = Math.max(0, Number(requiredValue ?? 0));
      const targetAmount = recipeCapacity * requiredPerCycle;
      const stored = getStoredInputCount(building, resourceId);
      const reserved = getReservedInputCount(state, building.id, resourceId);
      const amount = Math.max(0, targetAmount - stored - reserved);
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
