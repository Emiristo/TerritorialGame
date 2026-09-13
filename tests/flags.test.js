import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { addStandaloneFlag, canPlaceStandaloneFlag, createStandaloneFlag, getFlagAdjacentTiles, getFlagAtNode, removeFlag } from '../src/game/flags.js';
import { addRoad, createRoad } from '../src/game/roads.js';

describe('standalone flags', () => {
  it('creates a flag only at an inter-cell node shared by four cells', () => {
    const f = createStandaloneFlag('f', 'player', 20, 20);
    expect(f).toMatchObject({ id: 'f', buildingId: null, ownerId: 'player', x: 20, y: 20 });
    expect(() => createStandaloneFlag('edge', 'player', 20, 20.5)).toThrow();
    expect(() => createStandaloneFlag('center', 'player', 20.5, 20.5)).toThrow();
  });

  it('maps a flag node to exactly four canonical World Map cells', () => {
    const s = createGameState();
    const tiles = getFlagAdjacentTiles(s, 50, 50);
    expect(tiles.map((tile) => tile.id)).toEqual(['49-49', '50-49', '49-50', '50-50']);
  });

  it('allows placement at a free four-cell inter-cell node inside controlled influence', () => {
    const s = createGameState();
    const f = addStandaloneFlag(s, 'f', 'player', 50, 53);
    expect(getFlagAtNode(s, 50, 53)).toBe(f);
  });

  it('rejects invalid, unowned, or out-of-influence nodes', () => {
    const s = createGameState();
    expect(canPlaceStandaloneFlag(s, -1, 20)).toBe(false);
    expect(canPlaceStandaloneFlag(s, 20, 20.5)).toBe(false);
    expect(canPlaceStandaloneFlag(s, 20.5, 20.5)).toBe(false);
    expect(canPlaceStandaloneFlag(s, 61, 50)).toBe(false);
  });

  it('rejects a node without four in-bounds cells', () => {
    const s = createGameState();
    expect(canPlaceStandaloneFlag(s, 0, 20)).toBe(false);
    expect(canPlaceStandaloneFlag(s, 100, 20)).toBe(false);
    expect(canPlaceStandaloneFlag(s, 20, 0)).toBe(false);
    expect(canPlaceStandaloneFlag(s, 20, 100)).toBe(false);
  });

  it('rejects an occupied node', () => {
    const s = createGameState();
    addStandaloneFlag(s, 'a', 'player', 50, 53);
    expect(canPlaceStandaloneFlag(s, 50, 53)).toBe(false);
  });

  it('rejects a flag node touching any building footprint cell', () => {
    const s = createGameState();
    expect(canPlaceStandaloneFlag(s, 50, 50)).toBe(false);
  });

  it('splits an existing road when a flag is placed at a four-cell inter-cell node', () => {
    const s = createGameState();
    addStandaloneFlag(s, 'a', 'player', 50, 53);
    addStandaloneFlag(s, 'b', 'player', 55, 53);
    addRoad(s, createRoad('road', 'a', 'b', ['50-52', '51-52', '52-52', '53-52', '54-52', '55-52']));
    const f = addStandaloneFlag(s, 'mid', 'player', 53, 53);
    expect(f.buildingId).toBeNull();
    expect(s.roads).toHaveLength(2);
    expect(s.roads.some((r) => r.startFlagId === 'a' && r.endFlagId === 'mid' && r.cells.join('|') === '50-52|51-52|52-52')).toBe(true);
    expect(s.roads.some((r) => r.startFlagId === 'mid' && r.endFlagId === 'b' && r.cells.join('|') === '53-52|54-52|55-52')).toBe(true);
    expect(s.flags.find((flag) => flag.id === 'a').roadIds).toHaveLength(1);
    expect(s.flags.find((flag) => flag.id === 'mid').roadIds).toHaveLength(2);
    expect(s.flags.find((flag) => flag.id === 'b').roadIds).toHaveLength(1);
  });

  it('keeps existing carriers on their original side when a road is split and provisions the new side separately', () => {
    const s = createGameState();
    addStandaloneFlag(s, 'a', 'player', 50, 53);
    addStandaloneFlag(s, 'b', 'player', 55, 53);
    addRoad(s, createRoad('road', 'a', 'b', ['50-52', '51-52', '52-52', '53-52', '54-52', '55-52']));
    const before = s.carriers.filter((carrier) => carrier.role === 'road' && carrier.roadId === 'road').map((carrier) => carrier.id);
    expect(before.length).toBe(1);

    addStandaloneFlag(s, 'mid', 'player', 53, 53);

    const first = s.roads.find((road) => road.startFlagId === 'a' && road.endFlagId === 'mid');
    const second = s.roads.find((road) => road.startFlagId === 'mid' && road.endFlagId === 'b');
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(s.carriers.find((carrier) => carrier.id === before[0]).roadId).toBe(first.id);
    expect(s.carriers.filter((carrier) => carrier.role === 'road' && carrier.roadId === second.id)).toHaveLength(1);
  });

  it('keeps the original road unchanged when a split would violate the minimum length', () => {
    const s = createGameState();
    addStandaloneFlag(s, 'a', 'player', 50, 53);
    addStandaloneFlag(s, 'b', 'player', 52, 53);
    addRoad(s, createRoad('road', 'a', 'b', ['50-52', '51-52', '52-52']));
    const before = s.roads.map((r) => ({ ...r, cells: [...r.cells] }));
    expect(canPlaceStandaloneFlag(s, 51, 53)).toBe(false);
    expect(s.roads).toEqual(before);
  });

  it('removes all roads and releases their carriers when a flag is removed', () => {
    const s = createGameState();
    addStandaloneFlag(s, 'a', 'player', 50, 53);
    addStandaloneFlag(s, 'b', 'player', 55, 53);
    addRoad(s, createRoad('road', 'a', 'b', ['50-52', '51-52', '52-52', '53-52', '54-52', '55-52']));
    expect(s.carriers.some((carrier) => carrier.roadId === 'road')).toBe(true);

    removeFlag(s, 'a');

    expect(s.roads).toHaveLength(0);
    expect(s.flags.some((flag) => flag.id === 'a')).toBe(false);
    expect(s.carriers.some((carrier) => carrier.roadId === 'road')).toBe(false);
    expect(s.logisticsNetwork.adjacency.a).toBeUndefined();
  });
});