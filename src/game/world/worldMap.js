import { createMapGeometry } from './mapGeometry.js';

function createTile(id, x, y, defaults = {}) {
  return {
    id,
    x,
    y,
    terrain: defaults.terrain ?? 'plains',
    ownerId: defaults.ownerId ?? null,
    influence: defaults.influence ? { ...defaults.influence } : {},
    resources: defaults.resources ? { ...defaults.resources } : {},
  };
}

export function createWorldMap(width, height, tileDefaults = {}) {
  const geometry = createMapGeometry(width, height);
  const tiles = new Array(geometry.size);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      tiles[y * width + x] = createTile(geometry.tileId(x, y), x, y, tileDefaults);
    }
  }

  return {
    width,
    height,
    size: geometry.size,
    geometry,
    tiles,
    roads: [],
    objects: [],
  };
}

export function getWorldTile(worldMap, x, y) {
  if (!worldMap?.geometry?.inBounds(x, y)) return null;
  return worldMap.tiles[y * worldMap.width + x] ?? null;
}

export function getWorldTileById(worldMap, id) {
  const coordinates = worldMap?.geometry?.parseTileId(id);
  return coordinates ? getWorldTile(worldMap, coordinates.x, coordinates.y) : null;
}
