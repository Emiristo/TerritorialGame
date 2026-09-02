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
  return 0;
}

function startNextConstructionMaterial(building) {
  const next = building.constructionQueue.shift();
  if (!next) return false;
  building.currentConstructionMaterial = next;
  building.currentConstructionMaterialRemainingTime = getMaterialDuration(next);
  building.constructionTimer = building.currentConstructionMaterialRemainingTime;
  building.constructionState = CONSTRUCTION_STATES.BUILDING;
  return true;
}

function allConstructionMaterialsProcessed(building) {
  return Object.entries(getConstructionMaterials(building)).every(([resource, amount]) => Number(building.constructionMaterialsDelivered?.[resource] ?? 0) >= Number(amount))
    && !(building.constructionQueue ?? []).length
    && !building.currentConstructionMaterial;
}

export function getConstructionTime(materials = {}) {
  return Number(materials.planks ?? 0) * BUILD_TIME_PER_PLANK + Number(materials.stone ?? 0) * BUILD_TIME_PER_STONE;
}

export function startConstruction(state, building, now = Date.now()) {
  building.constructionStartedAt = now;
  building.lastConstructionUpdateAt = now;
  building.constructionComplete = false;
  building.active = false;
  building.constructionState = CONSTRUCTION_STATES.PLACED;
  building.constructionTimer = 0;
  building.constructionTimerStartedAt = null;
  return building;
}

export function beginConstructionWaiting(building) {
  if (!building || building.constructionComplete) return building;
  if (building.constructionState === CONSTRUCTION_STATES.PLACED)
    building.constructionState = CONSTRUCTION_STATES.WAITING_FOR_MATERIAL;
  return building;
}

export function deliverMaterialAndStartConstruction(building, resourceId, amount = 1) {
  if (!building || building.constructionComplete) return 0;
  beginConstructionWaiting(building);
  const required = Number(building.constructionMaterialsRequired?.[resourceId] ?? 0);
  const delivered = Number(building.constructionMaterialsDelivered?.[resourceId] ?? 0);
  const units = Math.max(0, Math.min(Math.floor(Number(amount) || 0), required - delivered));
  if (!units) return 0;
  building.constructionMaterialsDelivered[resourceId] = delivered + units;
  for (let i = 0; i < units; i += 1) building.constructionQueue.push(resourceId);
  if (!building.currentConstructionMaterial) startNextConstructionMaterial(building);
  return units;
}

export function advanceConstruction(building, elapsedSeconds) {
  if (!building || building.constructionComplete) return building;
  beginConstructionWaiting(building);
  let remaining = Math.max(0, Number(elapsedSeconds) || 0);
  if (!building.currentConstructionMaterial) startNextConstructionMaterial(building);

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
        break;
      }

      if (building.constructionQueue.length) {
        startNextConstructionMaterial(building);
      } else {
        building.constructionState = CONSTRUCTION_STATES.WAITING_FOR_MATERIAL;
        break;
      }
    }
  }
  return building;
}

export function completeConstruction(state, buildingId, now = Date.now()) {
  const building = (state.buildings ?? []).find((item) => item.id === buildingId);
  if (!building) throw new Error('Building not found');
  if (!allConstructionMaterialsProcessed(building)) {
    throw new Error('Construction materials are not fully processed');
  }
  building.constructionQueue = [];
  building.currentConstructionMaterial = null;
  building.currentConstructionMaterialRemainingTime = 0;
  building.constructionComplete = true;
  building.active = true;
  building.constructionState = CONSTRUCTION_STATES.COMPLETED;
  building.constructionTimer = 0;
  building.lastConstructionUpdateAt = now;
  return building;
}

export function advanceAllConstructions(state, elapsedSeconds) {
  for (const building of state.buildings ?? []) advanceConstruction(building, elapsedSeconds);
  return state;
}
