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

export function distanceBetweenTiles(a, b, geometry = null) {
  if (!Number.isFinite(a?.x) || !Number.isFinite(a?.y) || !Number.isFinite(b?.x) || !Number.isFinite(b?.y)) return Infinity;
  if (geometry) return geometry.distance(a, b);
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function isWithinInfluenceRadius(sourceTile, targetTile, radius, geometry = null) {
  return distanceBetweenTiles(sourceTile, targetTile, geometry) <= radius;
}
