import { INFLUENCE_RADIUS, addInfluence, getInfluenceWinner, isWithinInfluenceRadius } from './influence.js';

export function createTerritorySource(id, ownerId, tileId, influence = 1) {
  return {
    id,
    ownerId,
    tileId,
    influence,
    radius: INFLUENCE_RADIUS,
    active: true,
  };
}

export function recalculateTerritories(state) {
  for (const tile of state.tiles) {
    tile.influence = {};
  }

  for (const source of state.territorySources ?? []) {
    if (!source.active) continue;
    const center = state.tiles.find((tile) => tile.id === source.tileId);
    if (!center) continue;

    for (const tile of state.tiles) {
      if (isWithinInfluenceRadius(center, tile, source.radius)) {
        addInfluence(tile, source.ownerId, source.influence);
      }
    }
  }

  for (const tile of state.tiles) {
    tile.ownerId = getInfluenceWinner(tile);
  }

  return state;
}

export function addTerritorySource(state, source) {
  state.territorySources ??= [];
  state.territorySources.push(source);
  recalculateTerritories(state);
  return source;
}

export function removeTerritorySource(state, sourceId) {
  state.territorySources = (state.territorySources ?? []).filter((source) => source.id !== sourceId);
  recalculateTerritories(state);
}

export function getOwnedTiles(state, ownerId) {
  return state.tiles.filter((tile) => tile.ownerId === ownerId);
}

export function getTerritorySourceAtTile(state, tileId) {
  return (state.territorySources ?? []).find((source) => source.tileId === tileId && source.active) ?? null;
}
