import { TERRAIN_TYPES } from './terrain.js';
import { createTileResources } from './resources.js';
import { INFLUENCE_RADIUS } from './influence.js';

export const MAP_WIDTH = 12;
export const MAP_HEIGHT = 8;

function getInitialTerrain(x, y) {
  if (y <= 1 || y >= MAP_HEIGHT - 2) return TERRAIN_TYPES.FOREST.id;
  if (x <= 1 || x >= MAP_WIDTH - 2) return TERRAIN_TYPES.HILLS.id;
  if ((x === 4 || x === 5) && y === 3) return TERRAIN_TYPES.MOUNTAINS.id;
  return TERRAIN_TYPES.PLAINS.id;
}

function createInitialResources(terrainId) {
  const resources = createTileResources();
  if (terrainId === TERRAIN_TYPES.FOREST.id) resources.wood = 9;
  if (terrainId === TERRAIN_TYPES.MOUNTAINS.id) {
    resources.stone = 9;
    resources.ore = 9;
  }
  if (terrainId === TERRAIN_TYPES.HILLS.id) resources.stone = 9;
  if (terrainId === TERRAIN_TYPES.PLAINS.id) resources.food = 9;
  return resources;
}

export function createGameState() {
  const tiles = [];

  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const terrain = getInitialTerrain(x, y);
      tiles.push({
        id: `${x}-${y}`,
        x,
        y,
        terrain,
        ownerId: null,
        influence: {},
        resources: createInitialResources(terrain),
      });
    }
  }

  const capital = tiles.find((tile) => tile.x === 5 && tile.y === 4);
  if (capital) {
    capital.ownerId = 'player';
    capital.influence.player = 1;
  }

  return {
    turn: 1,
    selectedTileId: null,
    player: {
      id: 'player',
      name: 'Игрок',
      resources: {
        wood: 0,
        stone: 0,
        ore: 0,
        food: 0,
      },
    },
    rules: {
      influenceRadius: INFLUENCE_RADIUS,
      workZoneRadius: INFLUENCE_RADIUS,
      resourceUnitPerExtraction: 1,
    },
    workZones: [],
    tiles,
  };
}

export function getSelectedTile(state) {
  return state.tiles.find((tile) => tile.id === state.selectedTileId) ?? null;
}
