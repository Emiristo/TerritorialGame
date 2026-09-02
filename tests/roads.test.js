import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { createFlag, addFlag } from '../src/game/flags.js';
import { buildRoadToNearestFlag, findNearestFlag } from '../src/game/roads.js';

function addTestFlag(state, id, x, y) {
  addFlag(state, createFlag(id, null, 'player', x, y));
}

describe('automatic road construction', () => {
  it('finds the nearest flag by Manhattan distance', () => {
    const state = createGameState();
    addTestFlag(state, 'flag-near', 55, 50);
    addTestFlag(state, 'flag-far', 60, 60);

    expect(findNearestFlag(state, 'flag-near').id).toBe('headquarters-1-flag');
    expect(findNearestFlag(state, 'headquarters-1-flag').id).toBe('flag-near');
  });

  it('builds a contiguous automatic road from a flag to the nearest flag', () => {
    const state = createGameState();
    addTestFlag(state, 'flag-near', 55, 50);
    addTestFlag(state, 'flag-far', 60, 60);

    const road = buildRoadToNearestFlag(state, 'flag-near', 'road-auto-1');

    expect(road).toMatchObject({
      id: 'road-auto-1',
      startFlagId: 'flag-near',
      endFlagId: 'headquarters-1-flag',
      active: true,
    });
    expect(road.cells[0]).toBe('55-50');
    expect(road.cells.at(-1)).toBe('50-52');
    expect(road.cells).toHaveLength(8);
    expect(state.roads).toHaveLength(1);
  });

  it('returns null when the selected flag has no other flag to connect to', () => {
    const state = createGameState();
    const hqFlag = state.flags[0];
    state.flags = [hqFlag];

    expect(buildRoadToNearestFlag(state, hqFlag.id, 'road-auto-1')).toBeNull();
  });
});
