import { advanceGameClock } from './clock.js';
import { advanceConstruction as advanceBuildingConstruction } from './buildings.js';

export function startConstruction(state, building, now = Date.now()) {
  building.constructionStartedAt = now;
  building.lastConstructionUpdateAt = now;
  building.constructionComplete = building.constructionTime === 0;
  building.active = building.constructionComplete;
  return building;
}

export function advanceConstruction(state, now = Date.now()) {
  const elapsed = advanceGameClock(state.clock, now);
  if (elapsed <= 0) return [];
  const completed = [];
  for (const building of state.buildings ?? []) {
    if (building.constructionComplete) continue;
    const wasComplete = building.constructionComplete;
    advanceBuildingConstruction(building, elapsed);
    building.lastConstructionUpdateAt = now;
    if (!wasComplete && building.constructionComplete) completed.push(building);
  }
  return completed;
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
  building.lastConstructionUpdateAt = now;
  return building;
}
