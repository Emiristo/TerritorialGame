import { TERRAIN_TYPES } from './terrain.js';
import { createTileResources } from './resources.js';
import { INFLUENCE_RADIUS } from './influence.js';
import { createTerritorySource, recalculateTerritories } from './territory.js';
import { BUILDING_TYPES, createBuilding, getFootprintTiles } from './buildings.js';

export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 100;
export const CAPITAL_X = 49;
export const CAPITAL_Y = 49;
export const HEADQUARTERS_CENTER_X = 50;
export const HEADQUARTERS_CENTER_Y = 50;
export const HEADQUARTERS_INFLUENCE_RADIUS = 10;

function getInitialTerrain(x, y) {
  const dx = Math.abs(x - HEADQUARTERS_CENTER_X);
  const dy = Math.abs(y - HEADQUARTERS_CENTER_Y);
  if (dx <= 3 && dy <= 3) return TERRAIN_TYPES.PLAINS.id;
  if (y < 15) return TERRAIN_TYPES.FOREST.id;
  if (x < 20 || x >= 80) return TERRAIN_TYPES.HILLS.id;
  if ((x + y) % 17 === 0 || (x * 3 + y) % 29 === 0) return TERRAIN_TYPES.MOUNTAINS.id;
  return TERRAIN_TYPES.PLAINS.id;
}

function createInitialResources(terrainId) {
  const resources = createTileResources();
  if (terrainId === TERRAIN_TYPES.FOREST.id) resources.wood = 9;
  if (terrainId === TERRAIN_TYPES.MOUNTAINS.id) { resources.stone = 9; resources.ore = 9; }
  if (terrainId === TERRAIN_TYPES.HILLS.id) resources.stone = 9;
  if (terrainId === TERRAIN_TYPES.PLAINS.id) resources.food = 9;
  return resources;
}

export function createGameState() {
  const tiles = [];
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const terrain = getInitialTerrain(x, y);
      tiles.push({ id: `${x}-${y}`, x, y, terrain, ownerId: null, influence: {}, resources: createInitialResources(terrain) });
    }
  }

  const state = {
    turn: 1,
    selectedTileId: null,
    player: { id: 'player', name: 'Игрок', resources: { wood: 0, stone: 0, ore: 0, food: 0 } },
    rules: { influenceRadius: INFLUENCE_RADIUS, headquartersInfluenceRadius: HEADQUARTERS_INFLUENCE_RADIUS, workZoneRadius: 5, resourceUnitPerExtraction: 1 },
    buildingTypes: Object.values(BUILDING_TYPES),
    territorySources: [],
    buildings: [],
    workZones: [],
    workers: [],
    tiles,
  };

  const headquarters = createBuilding('headquarters-1', 'player', BUILDING_TYPES.HEADQUARTERS.id, `${CAPITAL_X}-${CAPITAL_Y}`);
  state.buildings.push(headquarters);

  const headquartersCenter = tiles.find((tile) => tile.x === HEADQUARTERS_CENTER_X && tile.y === HEADQUARTERS_CENTER_Y);
  if (headquartersCenter) {
    state.territorySources.push(createTerritorySource('headquarters-player', 'player', headquartersCenter.id, 1, HEADQUARTERS_INFLUENCE_RADIUS));
    recalculateTerritories(state);
  }

  return state;
}

export function getSelectedTile(state) {
  return state.tiles.find((tile) => tile.id === state.selectedTileId) ?? null;
}

export function getHeadquartersTiles(state) {
  return getFootprintTiles(state, BUILDING_TYPES.HEADQUARTERS.id, `${CAPITAL_X}-${CAPITAL_Y}`);
}
