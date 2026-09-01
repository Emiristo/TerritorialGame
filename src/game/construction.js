import { advanceConstruction as advanceBuildingConstruction } from './buildings.js';

export const CONSTRUCTION_STATES = Object.freeze({ WAITING_FOR_MATERIAL: 'WAITING_FOR_MATERIAL', BUILDING: 'BUILDING', COMPLETED: 'COMPLETED' });

export function startConstruction(state, building, now = Date.now()) {
  building.constructionStartedAt = now;
  building.lastConstructionUpdateAt = now;
  building.constructionComplete = false;
  building.active = false;
  building.constructionState = CONSTRUCTION_STATES.WAITING_FOR_MATERIAL;
  building.constructionTimer = 0;
  building.constructionTimerStartedAt = null;
  return building;
}

export function advanceConstruction(building, elapsedSeconds) {
  if (!building || building.constructionComplete) return building;
  advanceBuildingConstruction(building, elapsedSeconds);
  if (building.constructionComplete) building.constructionState = CONSTRUCTION_STATES.COMPLETED;
  else if (building.currentConstructionMaterial) building.constructionState = CONSTRUCTION_STATES.BUILDING;
  else building.constructionState = CONSTRUCTION_STATES.WAITING_FOR_MATERIAL;
  return building;
}

export function deliverMaterialAndStartConstruction(building, resourceId, amount = 1) {
  const delivered = building.constructionMaterialsDelivered?.[resourceId] ?? 0;
  const required = building.constructionMaterialsRequired?.[resourceId] ?? 0;
  const units = Math.max(0, Math.min(Math.floor(Number(amount) || 0), required - delivered));
  if (!units) return 0;
  building.constructionMaterialsDelivered[resourceId] = delivered + units;
  for (let i = 0; i < units; i += 1) building.constructionQueue.push(resourceId);
  if (!building.constructionComplete && !building.currentConstructionMaterial) {
    building.constructionState = CONSTRUCTION_STATES.BUILDING;
    building.constructionTimerStartedAt = Date.now();
  }
  return units;
}

export function completeConstruction(state, buildingId, now = Date.now()) {
  const building = (state.buildings ?? []).find((item) => item.id === buildingId);
  if (!building) throw new Error('Building not found');
  const required = building.constructionMaterialsRequired ?? {};
  for (const [resource, amount] of Object.entries(required)) {
    const delivered = Number(building.constructionMaterialsDelivered?.[resource] ?? 0);
    if (delivered < Number(amount)) throw new Error(`Missing construction material: ${resource}`);
  }
  building.constructionQueue = [];
  building.currentConstructionMaterial = null;
  building.currentConstructionMaterialRemainingTime = 0;
  building.remainingConstructionTime = 0;
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
