import { it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { createFlag, addFlag } from '../src/game/flags.js';
import { createRoad, addRoad, findShortestRoadPaths, isRoadPathValid, splitRoadAtNode } from '../src/game/roads.js';

it('debug roads', () => {
  const state = createGameState();
  console.log('HQ FLAG', state.flags.find((f) => f.id === 'headquarters-1-flag'));
  addFlag(state, createFlag('target', null, 'player', 53, 52));
  const paths = findShortestRoadPaths(state, 'headquarters-1-flag', 'target');
  console.log('PATHS', JSON.stringify(paths));
  console.log('VALID', paths.map((cells) => isRoadPathValid(state, { id: 'debug', startFlagId: 'headquarters-1-flag', endFlagId: 'target', cells, active: true })));

  const a = createFlag('a', null, 'player', 1, 1);
  const b = createFlag('b', null, 'player', 6, 1);
  const split = createFlag('split', null, 'player', 4, 1);
  addFlag(state, a); addFlag(state, b); addFlag(state, split);
  const road = addRoad(state, createRoad('debug-road', 'a', 'b', ['1-1','2-1','3-1','4-1','5-1','6-1']));
  console.log('SPLIT BEFORE', JSON.stringify(road));
  console.log('SPLIT RESULT', JSON.stringify(splitRoadAtNode(state, road.id, 4, 1, { flagId: 'split' })));
});
