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
  if (building.constructionComplete) return 0;
  const required = Number(building.constructionMaterialsRequired?.[resourceId] ?? 0);
  const delivered = Number(building.constructionMaterialsDelivered?.[resourceId] ?? 0);
  const units = Math.max(0, Math.min(Math.floor(Number(amount) || 0), required - delivered));
  if (!units) return 0;
  const available = Number(state.player?.resources?.[resourceId] ?? 0);
  if (available < units) return 0;
  state.player.resources[resourceId] = available - units;
  building.constructionMaterialsDelivered[resourceId] = delivered + units;
  for (let i = 0; i < units; i += 1) building.constructionQueue.push(resourceId);
  return units;
}
