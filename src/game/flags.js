import { isWithinInfluenceRadius } from './influence.js';
import { rebuildLogisticsNetwork } from './logisticsNetwork.js';
import { getRoadAtNode, splitRoadAtNode } from './roads.js';

function isValidNodeCoordinate(x, y) {
  return Number.isFinite(x) && Number.isFinite(y)
    && x >= 0 && x <= 100 && y >= 0 && y <= 100
    && Number.isInteger(x * 2) && Number.isInteger(y * 2)
    && (Number.isInteger(x) || Number.isInteger(y));
}

export function createFlag(id, buildingId = null, ownerId, x, y) {
  if (!isValidNodeCoordinate(x, y)) throw new Error('Flag coordinates must be a valid inter-cell node');
  return { id, buildingId, ownerId, x, y, roadIds: [], connected: false };
}
export function createStandaloneFlag(id, ownerId, x, y) { return createFlag(id, null, ownerId, x, y); }
export function getFlagAtNode(state, x, y) { return (state.flags ?? []).find((f) => f.x === x && f.y === y) ?? null; }
export function getFlagAtTile(state, tileId) {
  const s = String(tileId ?? '').indexOf('-');
  if (s <= 0) return null;
  return getFlagAtNode(state, Number(String(tileId).slice(0, s)), Number(String(tileId).slice(s + 1)));
}
export function getFlagForBuilding(state, buildingId) { return (state.flags ?? []).find((f) => f.buildingId === buildingId) ?? null; }

function nodeInsideBuilding(state, x, y) {
  return (state.buildings ?? []).some((b) => {
    const t = (state.buildingTypes ?? []).find((i) => i.id === b.typeId), s = String(b.tileId ?? '').indexOf('-');
    if (!t || s <= 0) return false;
    const ox = Number(b.tileId.slice(0, s)), oy = Number(b.tileId.slice(s + 1));
    return x > ox && x < ox + t.width && y > oy && y < oy + t.height;
  });
}

function getAdjacentTiles(state, x, y) {
  return (state.tiles ?? []).filter((t) => Math.abs((t.x + 0.5) - x) <= 0.5 && Math.abs((t.y + 0.5) - y) <= 0.5);
}

function ownedAdjacent(state, x, y, ownerId) {
  return getAdjacentTiles(state, x, y).some((t) => t.ownerId === ownerId);
}

export function isNodeWithinOwnerInfluence(state, x, y, ownerId) {
  return (state.territorySources ?? []).some((source) => {
    if (!source.active || source.ownerId !== ownerId) return false;
    const center = (state.tiles ?? []).find((tile) => tile.id === source.tileId);
    if (!center) return false;
    return isWithinInfluenceRadius(center, { x, y }, source.radius);
  });
}

export function canPlaceStandaloneFlag(state, x, y, ownerId = state.player.id) {
  if (!isValidNodeCoordinate(x, y) || getFlagAtNode(state, x, y) || nodeInsideBuilding(state, x, y)) return false;
  if (!ownedAdjacent(state, x, y, ownerId) || !isNodeWithinOwnerInfluence(state, x, y, ownerId)) return false;
  const road = getRoadAtNode(state, x, y);
  return !road || Boolean(splitRoadAtNode(state, road.id, x, y, { validateOnly: true }));
}

export function addFlag(state, flag) {
  state.flags ??= [];
  if (state.flags.some((i) => i.id === flag.id)) throw new Error(`Flag already exists: ${flag.id}`);
  if (getFlagAtNode(state, flag.x, flag.y)) throw new Error('Flag node is already occupied');
  state.flags.push(flag); return flag;
}
export function addStandaloneFlag(state, id, ownerId, x, y) {
  if (!canPlaceStandaloneFlag(state, x, y, ownerId)) throw new Error('Standalone flag cannot be placed at this node');
  const road = getRoadAtNode(state, x, y), flag = createStandaloneFlag(id, ownerId, x, y);
  addFlag(state, flag);
  if (road) splitRoadAtNode(state, road.id, x, y, { flagId: id });
  rebuildLogisticsNetwork(state); return flag;
}
export function removeFlag(state, flagId) {
  const i = (state.flags ?? []).findIndex((f) => f.id === flagId);
  if (i < 0) return null;
  const [r] = state.flags.splice(i, 1); return r;
}
