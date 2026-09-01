import { TERRAIN_TYPES } from './terrain.js';
import { createTileResources } from './resources.js';
import { INFLUENCE_RADIUS } from './influence.js';
import { createTerritorySource, recalculateTerritories } from './territory.js';
import { createWorkZone, createWorker, WORKER_TYPES } from './workers.js';
import { BUILDING_TYPES, createBuilding } from './buildings.js';

export const MAP_WIDTH = 24;
export const MAP_HEIGHT = 16;
export const CAPITAL_X = 12;
export const CAPITAL_Y = 8;

function getInitialTerrain(x, y) {
  if (y <= 3) return TERRAIN_TYPES.FOREST.id;
  if (x <= 7 || x >= MAP_WIDTH - 8) return TERRAIN_TYPES.HILLS.id;
  if ((x === 10 || x === 11 || x === 12 || x === 13) && (y === 6 || y === 7)) return TERRAIN_TYPES.MOUNTAINS.id;
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
      tiles.push({ id: `${x}-${y}`, x, y, terrain, ownerId: null, influence: {}, resources: createInitialResources(terrain) });
    }
  }

  const capital = tiles.find((tile) => tile.x === CAPITAL_X && tile.y === CAPITAL_Y);
  const state = {
    turn: 1,
    selectedTileId: null,
    player: { id: 'player', name: 'Игрок', resources: { wood: 0, stone: 0, ore: 0, food: 0 } },
    rules: { influenceRadius: INFLUENCE_RADIUS, workZoneRadius: INFLUENCE_RADIUS, resourceUnitPerExtraction: 1 },
    buildingTypes: Object.values(BUILDING_TYPES),
    territorySources: [],
    buildings: [],
    workZones: [],
    workers: [],
    tiles,
  };

  if (capital) {
    state.territorySources.push(createTerritorySource('capital-player', 'player', capital.id, 1));
    recalculateTerritories(state);

    const lumberTile = tiles.find((tile) => tile.terrain === TERRAIN_TYPES.FOREST.id && tile.ownerId === 'player');
    if (lumberTile) {
      const building = createBuilding('lumber-camp-1', 'player', BUILDING_TYPES.LUMBER_CAMP.id, lumberTile.id);
      state.buildings.push(building);
      const zone = createWorkZone('zone-lumber-camp-1', 'player', lumberTile.id, state.rules.workZoneRadius, building.id);
      state.workZones.push(zone);
      const worker = createWorker('lumberjack-1', 'player', WORKER_TYPES.LUMBERJACK.id);
      state.workers.push(worker);
      worker.buildingId = building.id;
      worker.zoneId = zone.id;
      worker.targetTileId = lumberTile.id;
      worker.state = 'working';
      building.workerIds.push(worker.id);
      zone.workerIds.push(worker.id);
    }
  }

  return state;
}

export function getSelectedTile(state) {
  return state.tiles.find((tile) => tile.id === state.selectedTileId) ?? null;
}
