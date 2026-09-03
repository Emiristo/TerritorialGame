import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { createFlag, addFlag } from '../src/game/flags.js';
import { addRoad, buildRoadToNearestFlag, createRoad, findNearestFlag, findShortestRoadPaths, isRoadPathValid } from '../src/game/roads.js';

function addTestFlag(state, id, x, y) { addFlag(state, createFlag(id, null, 'player', x, y)); }

describe('automatic road construction', () => {
  it('finds the nearest flag by grid distance', () => {
    const state = createGameState(); addTestFlag(state, 'flag-near', 55, 50); addTestFlag(state, 'flag-far', 60, 60);
    expect(findNearestFlag(state, 'flag-near').id).toBe('headquarters-1-flag'); expect(findNearestFlag(state, 'headquarters-1-flag').id).toBe('flag-near');
  });
  it('finds shortest paths using 8 directions with turns limited to 45 degrees', () => {
    const state = createGameState(); addTestFlag(state, 'flag-target', 53, 52); const paths = findShortestRoadPaths(state, 'headquarters-1-flag', 'flag-target');
    expect(paths.length).toBeGreaterThan(0); expect(paths.every((cells) => cells.length === 3)).toBe(true); expect(paths.every((cells) => isRoadPathValid(state, { id: 'test', startFlagId: 'headquarters-1-flag', endFlagId: 'flag-target', cells, active: true }))).toBe(true);
  });
  it('rejects roads shorter than two cells, longer than twenty cells, and road intersections', () => {
    const state = createGameState(); addTestFlag(state, 'flag-a', 40, 50); addTestFlag(state, 'flag-b', 50, 50); addTestFlag(state, 'flag-long', 60, 50); addTestFlag(state, 'flag-c', 45, 45); addTestFlag(state, 'flag-d', 45, 55);
    expect(isRoadPathValid(state, { id: 'too-short', startFlagId: 'flag-a', endFlagId: 'flag-b', cells: ['40-50'], active: true })).toBe(false);
    const twentyCells = Array.from({ length: 20 }, (_, i) => `${39 + i}-50`);
    expect(twentyCells.length).toBe(20);
    expect(isRoadPathValid(state, { id: 'max-length', startFlagId: 'flag-a', endFlagId: 'flag-long', cells: twentyCells, active: true })).toBe(true);
    const twentyOneCells = Array.from({ length: 21 }, (_, i) => `${39 + i}-50`);
    expect(isRoadPathValid(state, { id: 'too-long', startFlagId: 'flag-a', endFlagId: 'flag-long', cells: twentyOneCells, active: true })).toBe(false);
    addRoad(state, createRoad('road-existing', 'flag-a', 'flag-b', ['40-50', '41-50', '42-50', '43-50', '44-50', '45-50', '46-50', '47-50', '48-50', '49-50', '50-50']));
    expect(isRoadPathValid(state, { id: 'road-invalid', startFlagId: 'flag-c', endFlagId: 'flag-d', cells: ['45-45', '45-46', '45-47', '45-48', '45-49', '45-50', '45-51', '45-52', '45-53', '45-54', '45-55'], active: true })).toBe(false);
  });
  it('enforces a maximum of four roads per flag', () => {
    const state = createGameState(); const hqFlag = state.flags[0]; const endpoints = [['a', 45, 52], ['b', 50, 57], ['c', 55, 52], ['d', 50, 47], ['e', 45, 47]];
    for (const [id, x, y] of endpoints) addTestFlag(state, `flag-${id}`, x, y);
    for (let index = 0; index < 4; index += 1) { const flag = state.flags.find((item) => item.id === `flag-${endpoints[index][0]}`); const path = findShortestRoadPaths(state, hqFlag.id, flag.id)[0]; state.roads.push({ id: `existing-${index}`, startFlagId: hqFlag.id, endFlagId: flag.id, cells: path, active: true }); }
    expect(findShortestRoadPaths(state, hqFlag.id, 'flag-e')).toEqual([]);
  });
  it('returns null when the selected flag has no other flag to connect to', () => { const state = createGameState(); const hqFlag = state.flags[0]; state.flags = [hqFlag]; expect(buildRoadToNearestFlag(state, hqFlag.id, 'road-auto-1')).toBeNull(); });
});
