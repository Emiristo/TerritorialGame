import { describe, expect, test } from 'vitest';
import {
  GARRISON_CAPACITY,
  MAX_SOLDIER_RANK,
  MILITARY_BUILDING_TYPE_IDS,
  SOLDIER_CREATION_COST,
  SOLDIER_RANK_UP_COST,
  SOLDIER_RANKS,
  assignSoldierToGarrison,
  createMilitaryState,
  createSoldier,
  createSoldierFromStorage,
  ensureMilitaryState,
  getGarrisonCapacity,
  getMilitaryBuildingSpec,
  getMilitaryBuildings,
  getSoldier,
  getSoldierRankName,
  isMilitaryBuilding,
  isMilitaryBuildingType,
  promoteSoldier,
} from '../src/game/military.js';

describe('military core', () => {
  test('defines military building types from BUILDING_TYPES', () => {
    expect(MILITARY_BUILDING_TYPE_IDS).toEqual(['outpost', 'barracks', 'watchtower', 'fortress']);
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

  test('defines seven soldier ranks from private to general', () => {
    expect(MAX_SOLDIER_RANK).toBe(7);
    expect(SOLDIER_RANKS).toEqual({
      1: 'Рядовой',
      2: 'Ефрейтор',
      3: 'Сержант',
      4: 'Лейтенант',
      5: 'Капитан',
      6: 'Полковник',
      7: 'Генерал',
    });
    expect(getSoldierRankName(1)).toBe('Рядовой');
    expect(getSoldierRankName(7)).toBe('Генерал');
    expect(getSoldierRankName(8)).toBeNull();
  });

  test('creates a soldier only from one sword and one food in HQ or warehouse storage', () => {
    expect(SOLDIER_CREATION_COST).toEqual({ sword: 1, food: 1 });
    const state = {
      buildings: [{ id: 'hq1', typeId: 'headquarters', ownerId: 'p1', inventory: { sword: 2, food: 3 } }],
    };
    const soldier = createSoldierFromStorage(state, 's1', 'p1', 'hq1');
    expect(soldier).toMatchObject({ id: 's1', ownerId: 'p1', rank: 1, status: 'available' });
    expect(state.buildings[0].inventory).toEqual({ sword: 1, food: 2 });
  });

  test('does not create a soldier when either required resource is missing', () => {
    const state = {
      buildings: [{ id: 'w1', typeId: 'warehouse', ownerId: 'p1', inventory: { sword: 1, food: 0 } }],
    };
    expect(() => createSoldierFromStorage(state, 's1', 'p1', 'w1')).toThrow('Not enough food');
    expect(state.military).toBeUndefined();
  });

  test('rank upgrade consumes one coin and adds one rank in the garrison building', () => {
    expect(SOLDIER_RANK_UP_COST).toEqual({ coin: 1, rank: 1 });
    const state = {
      buildings: [{ id: 'b1', typeId: 'barracks', ownerId: 'p1', active: true, soldierIds: [], inventory: { coin: 2 } }],
    };
    const soldier = createSoldier(state, 's1', 'p1');
    assignSoldierToGarrison(state, 's1', 'b1');
    expect(promoteSoldier(state, 's1', 'b1')).toMatchObject({ rank: 2, garrisonBuildingId: 'b1' });
    expect(state.buildings[0].inventory.coin).toBe(1);
    expect(getSoldierRankName(soldier.rank)).toBe('Ефрейтор');
  });

  test('cannot promote a general beyond rank 7 or consume a coin', () => {
    const state = {
      buildings: [{ id: 'b1', typeId: 'barracks', ownerId: 'p1', active: true, soldierIds: [], inventory: { coin: 2 } }],
    };
    createSoldier(state, 's1', 'p1', MAX_SOLDIER_RANK);
    assignSoldierToGarrison(state, 's1', 'b1');
    expect(() => promoteSoldier(state, 's1', 'b1')).toThrow('Soldier is already at maximum rank');
    expect(state.buildings[0].inventory.coin).toBe(2);
    expect(getSoldier(state, 's1')).toMatchObject({ rank: 7 });
  });

  test('rejects invalid soldier ranks', () => {
    expect(() => createSoldier({}, 's1', 'p1', 0)).toThrow('Invalid soldier rank');
    expect(() => createSoldier({}, 's2', 'p1', 8)).toThrow('Invalid soldier rank');
  });

  test('uses approved garrison capacities', () => {
    expect(GARRISON_CAPACITY).toEqual({ outpost: 2, barracks: 3, watchtower: 6, fortress: 9 });
    expect(getGarrisonCapacity({ typeId: 'outpost' })).toBe(2);
    expect(getGarrisonCapacity({ typeId: 'barracks' })).toBe(3);
    expect(getGarrisonCapacity({ typeId: 'watchtower' })).toBe(6);
    expect(getGarrisonCapacity({ typeId: 'fortress' })).toBe(9);
  });

  test('returns created soldier by id', () => {
    const state = { buildings: [{ id: 'w1', typeId: 'warehouse', ownerId: 'p1', inventory: { sword: 1, food: 1 } }] };
    createSoldierFromStorage(state, 's1', 'p1', 'w1');
    expect(getSoldier(state, 's1')).toMatchObject({ id: 's1', rank: 1 });
  });
});
