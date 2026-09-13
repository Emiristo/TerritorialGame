import { describe, expect, test } from 'vitest';
import {
  MILITARY_BUILDING_TYPE_IDS,
  createMilitaryState,
  ensureMilitaryState,
  getMilitaryBuildingSpec,
  getMilitaryBuildings,
  isMilitaryBuilding,
  isMilitaryBuildingType,
} from '../src/game/military.js';

describe('military core', () => {
  test('defines military building types from BUILDING_TYPES', () => {
    expect(MILITARY_BUILDING_TYPE_IDS).toEqual([
      'outpost',
      'barracks',
      'watchtower',
      'fortress',
    ]);
    expect(isMilitaryBuildingType('barracks')).toBe(true);
    expect(isMilitaryBuildingType('warehouse')).toBe(false);
  });

  test('recognizes military buildings without duplicating building state', () => {
    const building = { id: 'b1', typeId: 'watchtower', ownerId: 'p1' };
    expect(isMilitaryBuilding(building)).toBe(true);
    expect(isMilitaryBuilding({ id: 'b2', typeId: 'warehouse', ownerId: 'p1' })).toBe(false);
    expect(getMilitaryBuildingSpec('watchtower').id).toBe('watchtower');
  });

  test('filters military buildings by owner', () => {
    const state = {
      buildings: [
        { id: 'b1', typeId: 'barracks', ownerId: 'p1' },
        { id: 'b2', typeId: 'warehouse', ownerId: 'p1' },
        { id: 'b3', typeId: 'fortress', ownerId: 'p2' },
      ],
    };

    expect(getMilitaryBuildings(state)).toHaveLength(2);
    expect(getMilitaryBuildings(state, 'p1').map((b) => b.id)).toEqual(['b1']);
  });

  test('military state is isolated from worldMap and territory ownership', () => {
    const military = createMilitaryState();
    expect(military).toEqual({ soldiers: [], orders: [] });
    expect(military.worldMap).toBeUndefined();
    expect(military.ownerId).toBeUndefined();
  });

  test('ensures one military state on game state', () => {
    const state = {};
    const first = ensureMilitaryState(state);
    const second = ensureMilitaryState(state);
    expect(first).toBe(second);
    expect(state.military).toEqual({ soldiers: [], orders: [] });
  });
});
