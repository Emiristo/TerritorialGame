import { rebuildLogisticsNetwork } from './logisticsNetwork.js';
import { getRoadAtNode, splitRoadAtNode } from './roads.js';

function isValidNodeCoordinate(x, y) {
  return Number.isFinite(x) && Number.isFinite(y)
    && x >= 0 && x <= 100 && y >= 0 && y <= 100
    && Number.isInteger(x * 2) && Number.isInteger(y * 2);
}

export function createFlag(id, buildingId = null, ownerId, x, y) {
  if (!isValidNodeCoordinate(x, y)) throw new Error('Flag coordinates must be a valid inter-cell node');
  return { id, buildingId, ownerId, x, y, roadIds: [], connected: false };
}

export function createStandaloneFlag(id, ownerId, x, y) {
  return createFlag(id, null, ownerId, x, y);
}

export function getFlagAtNode(state, x, y) {
  return (state.flags ?? []).find((flag) => flag.x === x && flag.y === y) ?? null;
}

export function getFlagAtTile(state, tileId) {
  const separator = String(tileId ?? '').indexOf('-');
  if (separator <= 0) return null;
  const x = Number(tileId.slice(0, separator));
  const y = Number(tileId.slice(separator + 1));
  return getFlagAtNode(state, x, y);
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
    const separator = String(building.tileId ?? '').indexOf('-');
    if (!type || separator <= 0) return false;
    const originX = Number(building.tileId.slice(0, separator));
    const originY = Number(building.tileId.slice(separator + 1));
    return Number.isInteger(originX) && Number.isInteger(originY)
      && x >= originX && x < originX + type.width
      && y >= originY && y < originY + type.height;
  });
}

export function canPlaceStandaloneFlag(state, x, y, ownerId = state.player.id) {
  if (!isValidNodeCoordinate(x, y)) return false;
  if (getFlagAtNode(state, x, y)) return false;
  if (Number.isInteger(x) && Number.isInteger(y) && isBuildingFootprintTile(state, x, y)) return false;

  const road = getRoadAtNode(state, x, y);
  if (road && !splitRoadAtNode(state, road.id, x, y, { validateOnly: true })) return false;

  if (Number.isInteger(x) && Number.isInteger(y)) {
    const tile = getTileAt(state, x, y);
    if (!tile || tile.ownerId !== ownerId) return false;
  } else {
    const adjacent = state.tiles?.filter((tile) => Math.abs(tile.x - x) <= 0.5 && Math.abs(tile.y - y) <= 0.5) ?? [];
    if (!adjacent.length || adjacent.some((tile) => tile.ownerId !== ownerId)) return false;
  }
  return true;
}

export function addFlag(state, flag) {
  state.flags ??= [];
  if (state.flags.some((item) => item.id === flag.id)) throw new Error(`Flag already exists: ${flag.id}`);
  if (getFlagAtNode(state, flag.x, flag.y)) throw new Error('Flag node is already occupied');
  state.flags.push(flag);
  return flag;
}

export function addStandaloneFlag(state, id, ownerId, x, y) {
  if (!canPlaceStandaloneFlag(state, x, y, ownerId)) throw new Error('Standalone flag cannot be placed at this node');
  const road = getRoadAtNode(state, x, y);
  const flag = createStandaloneFlag(id, ownerId, x, y);
  addFlag(state, flag);
  if (road) splitRoadAtNode(state, road.id, x, y, { flagId: id });
  rebuildLogisticsNetwork(state);
  return flag;
}

export function removeFlag(state, flagId) {
  const index = (state.flags ?? []).findIndex((flag) => flag.id === flagId);
  if (index < 0) return null;
  const [removed] = state.flags.splice(index, 1);
  return removed;
}
