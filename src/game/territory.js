import { addInfluence, getInfluenceWinner, isWithinInfluenceRadius } from './influence.js';

function getTiles(state) {
  return state.worldMap?.tiles ?? state.tiles ?? [];
}

function getGeometry(state) {
  return state.worldMap?.geometry ?? null;
}

function getTileById(state, tileId) {
  const worldMap = state.worldMap;
  if (worldMap?.getWorldTileById) return worldMap.getWorldTileById(tileId) ?? null;
  return getTiles(state).find((tile) => tile.id === tileId) ?? null;
}

export function createTerritorySource(id, ownerId, tileId, influence = 1, radius) {
  if (!Number.isInteger(radius) || radius < 0) throw new Error('Territory source radius is required');
  return { id, ownerId, tileId, influence, radius, active: true };
}

export function recalculateTerritories(state) {
  const tiles = getTiles(state);
  const geometry = getGeometry(state);
  for (const tile of tiles) tile.influence = {};
  for (const source of state.territorySources ?? []) {
    if (!source.active) continue;
    const center = getTileById(state, source.tileId);
    if (!center) continue;
    const candidates = geometry ? geometry.radius(center, source.radius) : tiles;
    for (const candidate of candidates) {
      const tile = getTileById(state, candidate.id);
      if (!tile) continue;
      if (geometry ? geometry.distance(center, tile) <= source.radius : isWithinInfluenceRadius(center, tile, source.radius)) {
        addInfluence(tile, source.ownerId, source.influence);
      }
    }
  }
  for (const tile of tiles) tile.ownerId = getInfluenceWinner(tile);
  return state;
}

export function addTerritorySource(state, source) {
  state.territorySources ??= [];
  state.territorySources.push(source);
  return recalculateTerritories(state);
}

export function removeTerritorySource(state, sourceId) {
  state.territorySources = (state.territorySources ?? []).filter((source) => source.id !== sourceId);
  return recalculateTerritories(state);
}

export function getOwnedTiles(state, ownerId) { return getTiles(state).filter((tile) => tile.ownerId === ownerId); }
export function getTerritorySourceAtTile(state, tileId) { return (state.territorySources ?? []).find((source) => source.tileId === tileId && source.active) ?? null; }
