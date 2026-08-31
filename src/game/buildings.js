export const BUILDING_TYPES = {
  LUMBER_CAMP: { id: 'lumber_camp', name: 'Лесопилка', workerTypeId: 'lumberjack', resourceId: 'wood', terrainId: 'forest' },
  QUARRY: { id: 'quarry', name: 'Каменоломня', workerTypeId: 'stonemason', resourceId: 'stone', terrainId: 'hills' },
  MINE: { id: 'mine', name: 'Шахта', workerTypeId: 'miner', resourceId: 'ore', terrainId: 'mountains' },
};

export function createBuilding(id, ownerId, typeId, tileId) {
  const type = Object.values(BUILDING_TYPES).find((item) => item.id === typeId);
  if (!type) throw new Error(`Unknown building type: ${typeId}`);
  return { id, ownerId, typeId, tileId, active: true, workerIds: [] };
}

export function getBuildingType(building) {
  return Object.values(BUILDING_TYPES).find((item) => item.id === building.typeId) ?? null;
}

export function canBuildOnTile(state, typeId, tileId, ownerId = state.player.id) {
  const type = Object.values(BUILDING_TYPES).find((item) => item.id === typeId);
  const tile = state.tiles.find((item) => item.id === tileId);
  if (!type || !tile) return false;
  return tile.ownerId === ownerId && tile.terrain === type.terrainId;
}

export function addBuilding(state, building) {
  if (!canBuildOnTile(state, building.typeId, building.tileId, building.ownerId)) {
    throw new Error('Building cannot be placed on this tile');
  }
  state.buildings ??= [];
  if (state.buildings.some((item) => item.tileId === building.tileId && item.active)) {
    throw new Error('Tile already has an active building');
  }
  state.buildings.push(building);
  return building;
}

export function getBuildingAtTile(state, tileId) {
  return (state.buildings ?? []).find((building) => building.tileId === tileId && building.active) ?? null;
}
