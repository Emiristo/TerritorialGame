import { describe, expect, it } from 'vitest';
import { createGameState, MAP_WIDTH, MAP_HEIGHT, CAPITAL_X, CAPITAL_Y } from '../src/game/state.js';
import { TERRAIN_BY_ID } from '../src/game/terrain.js';
import { INFLUENCE_RADIUS, isWithinInfluenceRadius } from '../src/game/influence.js';
import { WORKER_TYPES, createWorkZone, createWorker, assignWorkerToBuilding, extractForWorker } from '../src/game/workers.js';
import { BUILDING_TYPES, addBuilding, canBuildOnTile, createBuilding } from '../src/game/buildings.js';
import { createTerritorySource, addTerritorySource, getOwnedTiles } from '../src/game/territory.js';

describe('game state', () => {
  it('creates the expanded map', () => {
    const state = createGameState();
    expect(state.tiles).toHaveLength(MAP_WIDTH * MAP_HEIGHT);
    expect(MAP_WIDTH).toBe(24);
    expect(MAP_HEIGHT).toBe(16);
  });

  it('places the capital in the centre area', () => {
    const state = createGameState();
    const capital = state.tiles.find((tile) => tile.x === CAPITAL_X && tile.y === CAPITAL_Y);
    expect(capital?.ownerId).toBe('player');
    expect(capital?.influence.player).toBe(1);
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
    const building = state.buildings.find((item) => item.id === worker.buildingId);
    expect(state.buildings).toHaveLength(1);
    expect(building?.typeId).toBe(BUILDING_TYPES.LUMBER_CAMP.id);
    expect(worker.buildingId).toBe(building.id);
    expect(worker.zoneId).toBe(state.workZones[0].id);
    expect(worker.targetTileId).toBe(building.tileId);
    expect(state.workZones[0].buildingId).toBe(building.id);
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
    const assigned = assignWorkerToBuilding(state, worker.id, building.id, building.tileId);
    expect(assigned.buildingId).toBe(building.id);
    expect(assigned.zoneId).toBe(state.workZones[0].id);
  });

  it('extracts exactly one unit for a worker', () => {
    const state = createGameState();
    const worker = state.workers[0];
    const forest = state.tiles.find((tile) => tile.id === worker.targetTileId);
    expect(forest.resources.wood).toBe(9);
    const result = extractForWorker(state, worker);
    expect(result.extracted).toBe(true);
    expect(result.amount).toBe(1);
    expect(state.player.resources.wood).toBe(1);
    expect(state.tiles.find((tile) => tile.id === result.tileId).resources.wood).toBe(8);
  });

  it('allows extraction from an unowned resource inside the work zone', () => {
    const state = createGameState();
    const worker = state.workers[0];
    const zone = state.workZones[0];
    const center = state.tiles.find((tile) => tile.id === zone.centerTileId);
    const target = state.tiles.find((tile) => tile.terrain === 'forest' && Math.max(Math.abs(tile.x - center.x), Math.abs(tile.y - center.y)) <= zone.radius && tile.id !== worker.targetTileId);
    expect(target).toBeDefined();
    target.ownerId = null;
    target.resources.wood = 9;
    worker.targetTileId = target.id;
    const result = extractForWorker(state, worker);
    expect(result.extracted).toBe(true);
    expect(target.resources.wood).toBe(8);
    expect(state.player.resources.wood).toBe(1);
  });

  it('does not extract when the selected resource is outside the work zone', () => {
    const state = createGameState();
    const worker = state.workers[0];
    const zone = state.workZones[0];
    const center = state.tiles.find((tile) => tile.id === zone.centerTileId);
    const target = state.tiles.find((tile) => tile.terrain === 'forest' && Math.max(Math.abs(tile.x - center.x), Math.abs(tile.y - center.y)) > zone.radius);
    expect(target).toBeDefined();
    worker.targetTileId = target.id;
    expect(extractForWorker(state, worker).extracted).toBe(false);
    expect(state.player.resources.wood).toBe(0);
  });

  it('does not switch to another deposit after the assigned deposit is depleted', () => {
    const state = createGameState();
    const worker = state.workers[0];
    const assigned = state.tiles.find((tile) => tile.id === worker.targetTileId);
    for (let i = 0; i < 9; i += 1) expect(extractForWorker(state, worker).extracted).toBe(true);
    const other = state.tiles.find((tile) => tile.terrain === 'forest' && tile.id !== assigned.id && tile.resources.wood > 0);
    expect(other).toBeDefined();
    expect(extractForWorker(state, worker).extracted).toBe(false);
    expect(assigned.resources.wood).toBe(0);
    expect(other.resources.wood).toBe(9);
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
    addTerritorySource(state, createTerritorySource('outpost', 'player', '20-2', 1));
    expect(state.tiles.find((tile) => tile.id === '21-2').ownerId).toBe('player');
  });

  it('leaves contested tiles neutral on equal influence', () => {
    const state = createGameState();
    addTerritorySource(state, createTerritorySource('enemy', 'enemy', '20-8', 1));
    const contested = state.tiles.find((tile) => tile.id === '17-8');
    expect(contested.influence.player).toBe(1);
    expect(contested.influence.enemy).toBe(1);
    expect(contested.ownerId).toBe(null);
  });

  it('expands territory when a second source is added', () => {
    const state = createGameState();
    const before = getOwnedTiles(state, 'player').length;
    addTerritorySource(state, createTerritorySource('outpost', 'player', '20-2', 1));
    expect(getOwnedTiles(state, 'player').length).toBeGreaterThan(before);
    expect(state.tiles.find((tile) => tile.id === '21-2').ownerId).toBe('player');
  });
});
