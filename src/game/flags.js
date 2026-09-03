export function createFlag(id, buildingId = null, ownerId, x, y) {
  return {
    id,
    buildingId,
    ownerId,
    x,
    y,
    roadIds: [],
    connected: false,
  };
}

export function createStandaloneFlag(id, ownerId, x, y) {
  return createFlag(id, null, ownerId, x, y);
}

export function getFlagAtTile(state, tileId) {
  return (state.flags ?? []).find((flag) => `${flag.x}-${flag.y}` === tileId) ?? null;
}

export function getFlagForBuilding(state, buildingId) {
  return (state.flags ?? []).find((flag) => flag.buildingId === buildingId) ?? null;
}

function getTileAt(state, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  return state.tiles?.find((tile) => tile.x === x && tile.y === y) ?? null;
}

function isBuildingFootprintTile(state, x, y) {
  return (state.buildings ?? []).some((building) => {
    const type = (state.buildingTypes ?? []).find((item) => item.id === building.typeId);
    if (!type) return false;
    const separator = String(building.tileId ?? '').indexOf('-');
    if (separator <= 0) return false;
    const originX = Number(building.tileId.slice(0, separator));
    const originY = Number(building.tileId.slice(separator + 1));
    return Number.isInteger(originX) && Number.isInteger(originY)
      && x >= originX && x < originX + type.width
      && y >= originY && y < originY + type.height;
  });
}

export function canPlaceStandaloneFlag(state, x, y, ownerId = state.player.id) {
  const tile = getTileAt(state, x, y);
  if (!tile || tile.ownerId !== ownerId) return false;
  if (getFlagAtTile(state, tile.id)) return false;
  if (isBuildingFootprintTile(state, x, y)) return false;
  return true;
}

export function addFlag(state, flag) {
  state.flags ??= [];
  if (state.flags.some((item) => item.id === flag.id)) throw new Error(`Flag already exists: ${flag.id}`);
  state.flags.push(flag);
  return flag;
}

export function addStandaloneFlag(state, id, ownerId, x, y) {
  if (!canPlaceStandaloneFlag(state, x, y, ownerId)) {
    throw new Error('Standalone flag cannot be placed on this tile');
  }
  return addFlag(state, createStandaloneFlag(id, ownerId, x, y));
}

export function removeFlag(state, flagId) {
  const index = (state.flags ?? []).findIndex((flag) => flag.id === flagId);
  if (index < 0) return null;
  const [removed] = state.flags.splice(index, 1);
  return removed;
}
