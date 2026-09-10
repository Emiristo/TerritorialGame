import { createMapGeometry } from './world/mapGeometry.js';

export function createInfluenceMap() { return {}; }
export function addInfluence(tile, actorId, amount) { tile.influence ??= {}; tile.influence[actorId] = (tile.influence[actorId] ?? 0) + amount; }
export function getInfluence(tile, actorId) { return tile.influence?.[actorId] ?? 0; }
export function getInfluenceWinner(tile) {
  const entries = Object.entries(tile.influence ?? {});
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  if (entries.length > 1 && entries[0][1] === entries[1][1]) return null;
  return entries[0][0];
}

function createGeometryForTiles(a, b) {
  const maxX = Math.max(a?.x ?? -1, b?.x ?? -1);
  const maxY = Math.max(a?.y ?? -1, b?.y ?? -1);
  if (!Number.isInteger(maxX) || !Number.isInteger(maxY) || maxX < 0 || maxY < 0) return null;
  return createMapGeometry(maxX + 1, maxY + 1);
}

export function distanceBetweenTiles(a, b) {
  const geometry = createGeometryForTiles(a, b);
  return geometry?.distance(a, b) ?? Infinity;
}

export function isWithinInfluenceRadius(sourceTile, targetTile, radius) {
  return distanceBetweenTiles(sourceTile, targetTile) <= radius;
}
