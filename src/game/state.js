import { TERRAIN_TYPES } from './terrain.js';
import { createTileResources, createPlayerResources } from './resources.js';
import { INFLUENCE_RADIUS } from './influence.js';
import { createTerritorySource, recalculateTerritories } from './territory.js';
import { BUILDING_TYPES, addBuilding, getFootprintTiles } from './buildings.js';
import { createGameClock } from './clock.js';
import { syncBuildingFlags } from './buildingLogistics.js';

export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 100;
export const CAPITAL_X = 49;
export const CAPITAL_Y = 49;
export const HEADQUARTERS_CENTER_X = 50;
export const HEADQUARTERS_CENTER_Y = 50;
export const HEADQUARTERS_INFLUENCE_RADIUS = 10;
export const STARTER_FOREST_AREA = { minX: 46, maxX: 47, minY: 42, maxY: 46 };
export const STARTER_STONE_AREA = { minX: 53, maxX: 54, minY: 54, maxY: 58 };
export const STARTER_HILLS_AREA = { minX: 43, maxX: 44, minY: 54, maxY: 55 };
export const STARTER_MOUNTAINS_AREA = { minX: 56, maxX: 57, minY: 43, maxY: 44 };
function inArea(x, y, area) { return x >= area.minX && x <= area.maxX && y >= area.minY && y <= area.maxY; }
function getInitialTerrain(x, y) {
  if (inArea(x, y, STARTER_FOREST_AREA)) return TERRAIN_TYPES.FOREST.id;
  if (inArea(x, y, STARTER_HILLS_AREA)) return TERRAIN_TYPES.HILLS.id;
  if (inArea(x, y, STARTER_MOUNTAINS_AREA)) return TERRAIN_TYPES.MOUNTAINS.id;
  return TERRAIN_TYPES.PLAINS.id;
}
function createInitialResources(terrainId, x, y) {
  const resources = createTileResources();
  if (terrainId === TERRAIN_TYPES.FOREST.id) resources.wood = 9;
  if (terrainId === TERRAIN_TYPES.PLAINS.id && inArea(x, y, STARTER_STONE_AREA)) resources.stone = 25;
  if (terrainId === TERRAIN_TYPES.HILLS.id) resources.stone = 25;
  if (terrainId === TERRAIN_TYPES.MOUNTAINS.id) resources.ore = 25;
  if (terrainId === TERRAIN_TYPES.PLAINS.id) resources.food = 9;
  return resources;
}
export function createGameState(now = Date.now()) {
  const tiles = [];
  for (let y = 0; y < MAP_HEIGHT; y += 1) for (let x = 0; x < MAP_WIDTH; x += 1) {
    const terrain = getInitialTerrain(x, y);
    tiles.push({ id: `${x}-${y}`, x, y, terrain, ownerId: null, influence: {}, resources: createInitialResources(terrain, x, y) });
  }
  const state = {
    selectedTileId: null, clock: createGameClock(now),
    player: { id: 'player', name: 'Игрок', resources: createPlayerResources() },
    rules: { influenceRadius: INFLUENCE_RADIUS, headquartersInfluenceRadius: HEADQUARTERS_INFLUENCE_RADIUS, workZoneRadius: 5, resourceUnitPerExtraction: 1 },
    buildingTypes: Object.values(BUILDING_TYPES), territorySources: [], buildings: [], flags: [], roads: [], logisticsNetwork: { adjacency: {} },
    workZones: [], workers: [], workerRequests: [], carriers: [], transportRequests: [], tiles,
  };
  const headquarters = addBuilding(state, 'headquarters-1', 'player', BUILDING_TYPES.HEADQUARTERS.id, `${CAPITAL_X}-${CAPITAL_Y}`);
  syncBuildingFlags(state);
  const headquartersCenter = tiles.find((tile) => tile.x === HEADQUARTERS_CENTER_X && tile.y === HEADQUARTERS_CENTER_Y);
  if (headquartersCenter) { state.territorySources.push(createTerritorySource('headquarters-player', 'player', headquartersCenter.id, 1, HEADQUARTERS_INFLUENCE_RADIUS)); recalculateTerritories(state); }
  return state;
}
export function getSelectedTile(state) { return state.tiles.find((tile) => tile.id === state.selectedTileId) ?? null; }
export function getHeadquartersTiles(state) { return getFootprintTiles(state, BUILDING_TYPES.HEADQUARTERS.id, `${CAPITAL_X}-${CAPITAL_Y}`); }
