const MAX_DELTA_SECONDS = 1;

export function startConstruction(state, building, now = Date.now()) {
  building.constructionStartedAt = now;
  building.lastConstructionUpdateAt = now;
  building.constructionComplete = building.remainingConstructionTime <= 0;
  building.active = building.constructionComplete;
  return building;
}

export function advanceConstruction(state, now = Date.now()) {
  const completed = [];
  for (const building of state.buildings ?? []) {
    if (building.constructionComplete) continue;
    const last = building.lastConstructionUpdateAt ?? now;
    const elapsed = Math.max(0, Math.min((now - last) / 1000, MAX_DELTA_SECONDS));
    if (elapsed <= 0) continue;
    building.lastConstructionUpdateAt = now;
    building.remainingConstructionTime = Math.max(0, building.remainingConstructionTime - elapsed);
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
