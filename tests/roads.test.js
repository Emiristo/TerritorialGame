import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { createFlag, addFlag } from '../src/game/flags.js';
import {
  buildRoadToNearestFlag,
  findNearestFlag,
  findShortestRoadPaths,
  isRoadPathValid,
} from '../src/game/roads.js';

function addTestFlag(state, id, x, y) {
  addFlag(state, createFlag(id, null, 'player', x, y));
}

describe('automatic road construction', () => {
  it('finds the nearest flag by grid distance', () => {
    const state = createGameState();
    addTestFlag(state, 'flag-near', 55, 50);
    addTestFlag(state, 'flag-far', 60, 60);

    expect(findNearestFlag(state, 'flag-near').id).toBe('headquarters-1-flag');
    expect(findNearestFlag(state, 'headquarters-1-flag').id).toBe('flag-near');
  });

  it('finds shortest paths using 8 directions with turns limited to 45 degrees', () => {
    const state = createGameState();
    addTestFlag(state, 'flag-target', 53, 52);

    const paths = findShortestRoadPaths(state, 'headquarters-1-flag', 'flag-target');

    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((cells) => cells.length === 4)).toBe(true);
    expect(paths.every((cells) => isRoadPathValid(state, {
      id: 'test',
      startFlagId: 'headquarters-1-flag',
      endFlagId: 'flag-target',
      cells,
      active: true,
    }))).toBe(true);
  });

  it('rejects roads shorter than two cells and road intersections', () => {
    const state = createGameState();
    addTestFlag(state, 'flag-a', 55, 50);
    addTestFlag(state, 'flag-b', 56, 50);

    expect(() => buildRoadToNearestFlag(state, 'flag-a', 'road-auto-1')).not.toThrow();
    expect(state.roads[0].cells.length).toBeGreaterThanOrEqual(2);

    const intersectingRoad = {
      id: 'road-invalid',
      startFlagId: 'headquarters-1-flag',
      endFlagId: 'flag-a',
      cells: ['50-52', '51-52', '52-52', '53-52', '54-51', '55-50'],
      active: true,
    };
    expect(isRoadPathValid(state, intersectingRoad)).toBe(false);
  });

  it('enforces a maximum of four roads per flag', () => {
    const state = createGameState();
    const hqFlag = state.flags[0];
    const endpoints = [
      ['a', 45, 52],
      ['b', 50, 57],
      ['c', 55, 52],
      ['d', 50, 47],
      ['e', 45, 47],
    ];

    for (const [id, x, y] of endpoints) addTestFlag(state, `flag-${id}`, x, y);

    for (let index = 0; index < 4; index += 1) {
      const flag = state.flags.find((item) => item.id === `flag-${endpoints[index][0]}`);
      const path = findShortestRoadPaths(state, hqFlag.id, flag.id)[0];
      state.roads.push({
        id: `existing-${index}`,
        startFlagId: hqFlag.id,
        endFlagId: flag.id,
        cells: path,
        active: true,
      });
    }

    expect(findShortestRoadPaths(state, hqFlag.id, 'flag-e')).toEqual([]);
  });

  it('returns null when the selected flag has no other flag to connect to', () => {
    const state = createGameState();
    const hqFlag = state.flags[0];
    state.flags = [hqFlag];

    expect(buildRoadToNearestFlag(state, hqFlag.id, 'road-auto-1')).toBeNull();
  });
});
