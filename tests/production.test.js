import { describe, expect, it } from 'vitest';
import { canStartProduction, startProduction, advanceProduction } from '../src/game/production.js';

const state = {
  buildingTypes: [{
    id: 'bakery',
    role: 'production',
    input: { flour: 1, water: 1 },
    output: { resourceId: 'bread' },
    productionTime: 10,
  }],
  buildings: [],
};

function makeState(overrides = {}) {
  return {
    ...state,
    ...overrides,
    buildings: [],
  };
}

describe('production', () => {
  it('starts automatically without a worker when a complete recipe is available', () => {
    const game = makeState();
    const building = {
      id: 'b1', typeId: 'bakery', active: true, constructionComplete: true,
      workerIds: [], outputStorageSlot: null,
      inputStorageSlots: ['flour', 'water', null, null],
    };
    game.buildings.push(building);

    expect(canStartProduction(game, building)).toBe(true);
    expect(startProduction(game, building)).toBe(true);
    expect(building.productionState).toBe('processing');
  });

  it('does not start when the recipe is incomplete', () => {
    const game = makeState();
    const building = {
      id: 'b1', typeId: 'bakery', active: true, constructionComplete: true,
      workerIds: [], outputStorageSlot: null,
      inputStorageSlots: ['flour', null, null, null],
    };
    game.buildings.push(building);

    expect(canStartProduction(game, building)).toBe(false);
  });

  it('finishes automatically and places the output in the output slot', () => {
    const game = makeState();
    const building = {
      id: 'b1', typeId: 'bakery', active: true, constructionComplete: true,
      workerIds: [], outputStorageSlot: null,
      inputStorageSlots: ['flour', 'water', null, null],
    };
    game.buildings.push(building);

    startProduction(game, building);
    expect(advanceProduction(game, building, 10)).toBe(true);
    expect(building.outputStorageSlot).toBe('bread');
  });
});
