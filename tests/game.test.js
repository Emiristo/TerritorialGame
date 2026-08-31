import { describe, expect, it } from 'vitest';
import { createGameState, MAP_WIDTH, MAP_HEIGHT } from '../src/game/state.js';
import { TERRAIN_BY_ID } from '../src/game/terrain.js';
import { INFLUENCE_RADIUS, isWithinInfluenceRadius } from '../src/game/influence.js';
import { WORKER_TYPES, createWorkZone, createWorker, assignWorkerToZone, extractForWorker } from '../src/game/workers.js';
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

describe('influence and work zones', () => {
  it('uses a radius of five cells for influence', () => {
    const center = { x: 0, y: 0 };
    expect(INFLUENCE_RADIUS).toBe(5);
    expect(isWithinInfluenceRadius(center, { x: 5, y: 0 })).toBe(true);
    expect(isWithinInfluenceRadius(center, { x: 6, y: 0 })).toBe(false);
  });
  it('uses the same five-cell radius for work zones', () => {
    expect(createWorkZone('zone-1', 'player', '0-0').radius).toBe(5);
  });
  it('assigns a worker to an owned work zone', () => {
    const state = createGameState();
    const worker = createWorker('worker-1', 'player', WORKER_TYPES.LUMBERJACK.id);
    state.workers.push(worker);
    const assigned = assignWorkerToZone(state, worker.id, 'capital-zone');
    expect(assigned.workZoneId).toBe('capital-zone');
  });
  it('extracts exactly one unit for a worker', () => {
    const state = createGameState();
    const worker = state.workers[0];
    assignWorkerToZone(state, worker.id, 'capital-zone');
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
    assignWorkerToZone(state, worker.id, 'capital-zone');
    for (let i = 0; i < 9; i += 1) extractForWorker(state, worker);
    const result = extractForWorker(state, worker);
    expect(result.extracted).toBe(false);
    expect(state.player.resources.wood).toBe(9);
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
