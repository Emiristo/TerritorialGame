import { syncWorkZones } from './workZones.js';

export const BUILD_TIME_PER_PLANK = 10;
export const BUILD_TIME_PER_STONE = 15;

export const CONSTRUCTION_STATES = Object.freeze({
  PLACED: 'PLACED',
  WAITING_FOR_MATERIAL: 'WAITING_FOR_MATERIAL',
  BUILDING: 'BUILDING',
  COMPLETED: 'COMPLETED'
});

function getConstructionMaterials(building) {
  return { ...(building?.constructionMaterialsRequired ?? {}) };
}

function getMaterialDuration(resourceId) {
  if (resourceId === 'planks') return BUILD_TIME_PER_PLANK;
  if (resourceId === 'stone') return BUILD_TIME_PER_STONE;
  throw new Error(`Unsupported construction material: ${resourceId}`);
}

function getBuildingFlag(state, building) {
  return (state.flags ?? []).find((flag) => flag.id === building.flagId || flag.buildingId === building.id) ?? null;
}

function ensureConstructionStorage(state, building) {
  const flag = getBuildingFlag(state, building);
  if (!flag) throw new Error('Construction flag not found');
  flag.constructionStorage ??= {};
  return flag.constructionStorage;
}

function allConstructionMaterialsProcessed(building) {
  return Object.entries(getConstructionMaterials(building)).every(([resource, amount]) =>
    Number(building.constructionMaterialsUsed?.[resource] ?? 0) >= Number(amount));
}

function takeNextConstructionMaterial(state, building) {
  if (building.currentConstructionMaterial) return true;
  const storage = ensureConstructionStorage(state, building);

  for (const [resource, requiredAmount] of Object.entries(getConstructionMaterials(building))) {
    const used = Number(building.constructionMaterialsUsed?.[resource] ?? 0);
    const available = Number(storage[resource] ?? 0);
    if (used < Number(requiredAmount) && available > 0) {
      storage[resource] = available - 1;
      building.constructionMaterialsUsed[resource] = used + 1;
      building.currentConstructionMaterial = resource;
      building.currentConstructionMaterialRemainingTime = getMaterialDuration(resource);
      building.constructionTimer = building.currentConstructionMaterialRemainingTime;
      building.constructionState = CONSTRUCTION_STATES.BUILDING;
      return true;
    }
  }

  building.constructionState = CONSTRUCTION_STATES.WAITING_FOR_MATERIAL;
  return false;
}

export function getConstructionTime(materials = {}) {
  return Number(materials.planks ?? 0) * BUILD_TIME_PER_PLANK + Number(materials.stone ?? 0) * BUILD_TIME_PER_STONE;
}

export function startConstruction(state, building, now = Date.now()) {
  ensureConstructionStorage(state, building);
  building.constructionStartedAt = now;
  building.lastConstructionUpdateAt = now;
  building.constructionComplete = false;
  building.active = false;
  building.constructionState = CONSTRUCTION_STATES.PLACED;
  building.constructionTimer = 0;
  building.constructionTimerStartedAt = null;
  building.constructionMaterialsDelivered ??= Object.fromEntries(
    Object.keys(getConstructionMaterials(building)).map((resource) => [resource, 0])
  );
  building.constructionMaterialsUsed ??= Object.fromEntries(
    Object.keys(getConstructionMaterials(building)).map((resource) => [resource, 0])
  );

  const storage = ensureConstructionStorage(state, building);
  for (const resource of Object.keys(getConstructionMaterials(building))) storage[resource] ??= 0;
  return building;
}

export function beginConstructionWaiting(building) {
  if (!building || building.constructionComplete) return building;
  if (building.constructionState === CONSTRUCTION_STATES.PLACED) {
    building.constructionState = CONSTRUCTION_STATES.WAITING_FOR_MATERIAL;
  }
  return building;
}

export function deliverMaterialToConstructionFlag(state, building, resourceId, amount = 1) {
  if (!building || building.constructionComplete) return 0;
  const required = Number(building.constructionMaterialsRequired?.[resourceId] ?? 0);
  const delivered = Number(building.constructionMaterialsDelivered?.[resourceId] ?? 0);
  const requested = Math.max(0, Math.floor(Number(amount) || 0));
  const units = Math.max(0, Math.min(requested, required - delivered));
  if (!units) return 0;

  const storage = ensureConstructionStorage(state, building);
  storage[resourceId] = Number(storage[resourceId] ?? 0) + units;
  building.constructionMaterialsDelivered[resourceId] = delivered + units;
  beginConstructionWaiting(building);
  return units;
}

export function advanceConstruction(state, building, elapsedSeconds) {
  if (!building || building.constructionComplete) return building;
  beginConstructionWaiting(building);
  let remaining = Math.max(0, Number(elapsedSeconds) || 0);

  if (!building.currentConstructionMaterial) takeNextConstructionMaterial(state, building);

  while (remaining > 0 && building.currentConstructionMaterial) {
    const work = Math.min(remaining, building.currentConstructionMaterialRemainingTime);
    building.currentConstructionMaterialRemainingTime -= work;
    building.constructionTimer = building.currentConstructionMaterialRemainingTime;
    remaining -= work;

    if (building.currentConstructionMaterialRemainingTime === 0) {
      building.currentConstructionMaterial = null;
      building.constructionTimer = 0;

      if (allConstructionMaterialsProcessed(building)) {
        building.constructionComplete = true;
        building.active = true;
        building.constructionState = CONSTRUCTION_STATES.COMPLETED;
        syncWorkZones(state);
        break;
      }

      if (!takeNextConstructionMaterial(state, building)) break;
    }
  }

  return building;
}

export function completeConstruction(state, buildingId, now = Date.now()) {
  const building = (state.buildings ?? []).find((item) => item.id === buildingId);
  if (!building) throw new Error('Building not found');
  if (building.currentConstructionMaterial || Number(building.currentConstructionMaterialRemainingTime ?? 0) > 0 || !allConstructionMaterialsProcessed(building)) {
    throw new Error('Construction materials are not fully processed');
  }

  building.currentConstructionMaterial = null;
  building.currentConstructionMaterialRemainingTime = 0;
  building.constructionComplete = true;
  building.active = true;
  building.constructionState = CONSTRUCTION_STATES.COMPLETED;
  building.constructionTimer = 0;
  building.lastConstructionUpdateAt = now;
  syncWorkZones(state);
  return building;
}

export function advanceAllConstructions(state, elapsedSeconds) {
  for (const building of state.buildings ?? []) advanceConstruction(state, building, elapsedSeconds);
  syncWorkZones(state);
  return state;
}
