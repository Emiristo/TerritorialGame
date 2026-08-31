import { describe, expect, it } from 'vitest';
import { createGameState, MAP_WIDTH, MAP_HEIGHT } from '../src/game/state.js';
import { TERRAIN_BY_ID } from '../src/game/terrain.js';
import { INFLUENCE_RADIUS, isWithinInfluenceRadius } from '../src/game/influence.js';
import { WORKER_TYPES, createWorkZone, createWorker, assignWorkerToBuilding, extractForWorker } from '../src/game/workers.js';
import { BUILDING_TYPES, addBuilding, canBuildOnTile, getBuildingAtTile, createBuilding } from '../src/game/buildings.js';
import { createTerritorySource, addTerritorySource, getOwnedTiles } from '../src/game/territory.js';

describe('game state', () => {
  it('creates the expected map dimensions', () => expect(createGameState().tiles).toHaveLength(MAP_WIDTH * MAP_HEIGHT));
  it('creates a starting territory around the capital', () => {
    const state = createGameState();
    const capital = state.tiles.find((tile) => tile.x === 5 && tile.y === 4);
    expect(capital.ownerId).toBe('player');
    expect(capital.influence.player).toBe(1);
    expect(getOwnedTiles(state, 'player').length).toBe(88);
  });
});

describe('terrain and resources', () => {
  it('defines the core terrain types', () => {
    expect(TERRAIN_BY_ID.plains).toBeDefined();
    expect(TERRAIN_BY_ID.forest).toBeDefined();
    expect(TERRAIN_BY_ID.hills).toBeDefined();
    expect(TERRAIN_BY_ID.mountains).toBeDefined();
    expect(TERRAIN_BY_ID.water).toBeDefined();
  });
  it('uses nine units as the base resource reserve', () => {
    const forest = createGameState().tiles.find((tile) => tile.terrain === 'forest');
    expect(forest.resources.wood).toBe(9);
  });
});

describe('buildings, workers and work zones', () => {
  it('creates a starting workplace for the starting worker', () => {
    const state = createGameState();
    const worker = state.workers[0];
    const building = getBuildingAtTile(state, worker.buildingId ? state.buildings.find((b) => b.id === worker.buildingId).tileId : null);
    expect(state.buildings).toHaveLength(1);
    expect(building?.typeId).toBe(BUILDING_TYPES.LUMBER_CAMP.id);
    expect(worker.buildingId).toBe(state.buildings[0].id);
    expect(worker.zoneId).toBe(state.workZones[0].id);
  });

  it('uses a radius of five cells for work zones', () => {
    expect(createWorkZone('zone-1', 'player', '0-0').radius).toBe(5);
    expect(INFLUENCE_RADIUS).toBe(5);
    expect(isWithinInfluenceRadius({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(true);
    expect(isWithinInfluenceRadius({ x: 0, y: 0 }, { x: 6, y: 0 })).toBe(false);
  });

  it('allows only compatible workers to work in a building', () => {
    const state = createGameState();
    const worker = createWorker('worker-1', 'player', WORKER_TYPES.LUMBERJACK.id);
    state.workers.push(worker);
    const building = state.buildings[0];
    const assigned = assignWorkerToBuilding(state, worker.id, building.id);
    expect(assigned.buildingId).toBe(building.id);
    expect(assigned.zoneId).toBe(state.workZones[0].id);
  });

  it('extracts exactly one unit for a worker', () => {
    const state = createGameState();
    const worker = state.workers[0];
    const forest = state.tiles.find((tile) => tile.terrain === 'forest' && tile.ownerId === 'player');
    expect(forest.resources.wood).toBe(9);
    const result = extractForWorker(state, worker);
    expect(result.extracted).toBe(true);
    expect(result.amount).toBe(1);
    expect(state.player.resources.wood).toBe(1);
    expect(state.tiles.find((tile) => tile.id === result.tileId).resources.wood).toBe(8);
  });

  it('does not extract from a depleted deposit', () => {
    const state = createGameState();
    const worker = state.workers[0];
    for (let i = 0; i < 9; i += 1) extractForWorker(state, worker);
    const result = extractForWorker(state, worker);
    expect(result.extracted).toBe(false);
    expect(state.player.resources.wood).toBe(9);
  });

  it('places a resource building only on owned compatible terrain', () => {
    const state = createGameState();
    const forest = state.tiles.find((tile) => tile.terrain === 'forest' && tile.ownerId === 'player');
    const plains = state.tiles.find((tile) => tile.terrain === 'plains' && tile.ownerId === 'player');
    expect(canBuildOnTile(state, BUILDING_TYPES.LUMBER_CAMP.id, forest.id)).toBe(true);
    expect(canBuildOnTile(state, BUILDING_TYPES.LUMBER_CAMP.id, plains.id)).toBe(false);
    expect(() => addBuilding(state, createBuilding('invalid', 'player', BUILDING_TYPES.LUMBER_CAMP.id, plains.id))).toThrow();
  });
});

describe('territories', () => {
  it('lets a new influence source claim uncontested tiles', () => {
    const state = createGameState();
    addTerritorySource(state, createTerritorySource('outpost', 'player', '10-0', 1));
    expect(state.tiles.find((tile) => tile.id === '11-0').ownerId).toBe('player');
  });
  it('leaves contested tiles neutral on equal influence', () => {
    const state = createGameState();
    addTerritorySource(state, createTerritorySource('enemy', 'enemy', '10-4', 1));
    const contested = state.tiles.find((tile) => tile.id === '7-4');
    expect(contested.influence.player).toBe(1);
    expect(contested.influence.enemy).toBe(1);
    expect(contested.ownerId).toBe(null);
  });
  it('expands territory when a second source is added', () => {
    const state = createGameState();
    const before = getOwnedTiles(state, 'player').length;
    addTerritorySource(state, createTerritorySource('outpost', 'player', '10-0', 1));
    expect(getOwnedTiles(state, 'player').length).toBeGreaterThan(before);
    expect(state.tiles.find((tile) => tile.id === '11-0').ownerId).toBe('player');
  });
});
