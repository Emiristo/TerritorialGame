import { advanceGameClock } from './clock.js';

export function startConstruction(state, building, now = Date.now()) {
  building.constructionStartedAt = now;
  building.lastConstructionUpdateAt = now;
  building.constructionComplete = building.remainingConstructionTime <= 0;
  building.active = building.constructionComplete;
  return building;
}

export function advanceConstruction(state, now = Date.now()) {
  const elapsed = advanceGameClock(state.clock, now);
  if (elapsed <= 0) return [];
  const completed = [];
  for (const building of state.buildings ?? []) {
    if (building.constructionComplete) continue;
    building.remainingConstructionTime = Math.max(0, building.remainingConstructionTime - elapsed);
    building.lastConstructionUpdateAt = now;
    if (building.remainingConstructionTime === 0) {
      building.constructionComplete = true;
      building.active = true;
      completed.push(building);
    }
  }
  return completed;
}

export function completeConstruction(state, buildingId, now = Date.now()) {
  const building = (state.buildings ?? []).find((item) => item.id === buildingId);
  if (!building) throw new Error('Building not found');
  building.remainingConstructionTime = 0;
  building.constructionComplete = true;
  building.active = true;
  building.lastConstructionUpdateAt = now;
  return building;
}
