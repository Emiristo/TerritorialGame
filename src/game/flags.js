import { isWithinInfluenceRadius } from './influence.js';
import { rebuildLogisticsNetwork } from './logisticsNetwork.js';
import { getRoadAtNode, removeRoadsForFlag, splitRoadAtNode } from './roads.js';
import { BUILDING_TYPES } from './buildings.js';
import { getWorldTileById } from './world/worldMap.js';

function getMapGeometry(state) {
  return state.worldMap?.geometry ?? null;
}

function isIntegerNodeCoordinate(x, y) {
  return Number.isFinite(x) && Number.isFinite(y)
    && Number.isInteger(x) && Number.isInteger(y);
}

function isValidNodeCoordinate(state, x, y) {
  const geometry = getMapGeometry(state);
  return isIntegerNodeCoordinate(x, y)
    && geometry !== null
    && x > 0 && x < geometry.width && y > 0 && y < geometry.height;
}

export function createFlag(id, buildingId = null, ownerId, x, y) {
  if (!isIntegerNodeCoordinate(x, y)) {
    throw new Error('Flag coordinates must be an inter-cell node at the intersection of four cells');
  }
  return { id, buildingId, ownerId, x, y, roadIds: [], connected: false, cargo: {} };
}

export function createStandaloneFlag(id, ownerId, x, y) {
  return createFlag(id, null, ownerId, x, y);
}

export function getFlagAtNode(state, x, y) {
  if (!isIntegerNodeCoordinate(x, y)) return null;
  return (state.flags ?? []).find((f) => f.x === x && f.y === y) ?? null;
}

export function getFlagAdjacentTiles(state, x, y) {
  const geometry = getMapGeometry(state);
  if (!geometry || !isIntegerNodeCoordinate(x, y)) return [];
  const tiles = [];
  for (const ty of [y - 1, y]) {
    for (const tx of [x - 1, x]) {
      const tile = geometry.inBounds(tx, ty)
        ? getWorldTileById(state.worldMap, geometry.tileId(tx, ty))
        : null;
      if (tile) tiles.push(tile);
    }
  }
  return tiles;
}

export function getFlagForBuilding(state, buildingId) {
  return (state.flags ?? []).find((f) => f.buildingId === buildingId) ?? null;
}

function isBuildingFootprintTile(state, tile) {
  if (!tile) return false;
  return (state.buildings ?? []).some((b) => {
    const type = Object.values(BUILDING_TYPES).find((candidate) => candidate.id === b.typeId);
    const s = String(b.tileId ?? '').indexOf('-');
    if (!type || s <= 0) return false;
    const ox = Number(b.tileId.slice(0, s));
    const oy = Number(b.tileId.slice(s + 1));
    return tile.x >= ox && tile.x < ox + type.width
      && tile.y >= oy && tile.y < oy + type.height;
  });
}

function ownedAdjacent(state, x, y, ownerId) {
  const tiles = getFlagAdjacentTiles(state, x, y);
  return tiles.length === 4 && tiles.every((t) => t.ownerId === ownerId);
}

function adjacentCellsAreFree(state, x, y) {
  const tiles = getFlagAdjacentTiles(state, x, y);
  return tiles.length === 4 && tiles.every((tile) => !isBuildingFootprintTile(state, tile));
}

export function isNodeWithinOwnerInfluence(state, x, y, ownerId) {
  const geometry = getMapGeometry(state);
  if (!geometry || !isIntegerNodeCoordinate(x, y)) return false;
  return (state.territorySources ?? []).some((source) => {
    if (!source.active || source.ownerId !== ownerId) return false;
    const center = getWorldTileById(state.worldMap, source.tileId);
    if (!center) return false;
    return isWithinInfluenceRadius(center, { x, y }, source.radius, geometry);
  });
}

export function canPlaceStandaloneFlag(state, x, y, ownerId = state.player.id) {
  if (!isValidNodeCoordinate(state, x, y) || getFlagAtNode(state, x, y)) return false;
  if (!adjacentCellsAreFree(state, x, y)) return false;
  if (!ownedAdjacent(state, x, y, ownerId) || !isNodeWithinOwnerInfluence(state, x, y, ownerId)) return false;
  const road = getRoadAtNode(state, x, y);
  return !road || Boolean(splitRoadAtNode(state, road.id, x, y, { validateOnly: true }));
}

export function addFlag(state, flag) {
  state.flags ??= [];
  if (!isValidNodeCoordinate(state, flag.x, flag.y)) throw new Error('Flag node is outside the valid World Map inter-cell node range');
  if (state.flags.some((i) => i.id === flag.id)) throw new Error(`Flag already exists: ${flag.id}`);
  if (getFlagAtNode(state, flag.x, flag.y)) throw new Error('Flag node is already occupied');
  flag.cargo ??= {};
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
  const i = (state.flags ?? []).findIndex((f) => f.id === flagId);
  if (i < 0) return null;
  const flag = state.flags[i];
  removeRoadsForFlag(state, flagId);
  state.flags.splice(i, 1);
  rebuildLogisticsNetwork(state);
  return flag;
}
