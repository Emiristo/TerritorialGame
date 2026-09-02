import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { createBuilding, addBuilding } from '../src/game/buildings.js';
import { syncBuildingFlags, destroyBuilding } from '../src/game/buildingLogistics.js';
import { getFlagForBuilding } from '../src/game/flags.js';
import { addRoad, createRoad, removeRoadsForFlag } from '../src/game/roads.js';
import { areFlagsConnected, findFlagRoute, rebuildLogisticsNetwork } from '../src/game/logisticsNetwork.js';

function prepareArea(state, x, y, width, height) {
  for (let dy = 0; dy < height; dy += 1) for (let dx = 0; dx < width; dx += 1) {
    const tile = state.tiles.find((item) => item.x === x + dx && item.y === y + dy);
    tile.ownerId = 'player';
    tile.terrain = 'plains';
  }
}

describe('building logistics flags', () => {
  it('creates one flag for the headquarters on its south side', () => {
    const state = createGameState();
    expect(state.flags).toHaveLength(1);
    const headquarters = state.buildings[0];
    const flag = getFlagForBuilding(state, headquarters.id);
    expect(flag).toMatchObject({ buildingId: headquarters.id, ownerId: 'player', x: 50, y: 52 });
  });

  it('creates a building flag automatically when the building is added', () => {
    const state = createGameState();
    prepareArea(state, 30, 30, 2, 2);
    const building = createBuilding('building-2', 'player', 'stonecutter_hut', '30-30');
    addBuilding(state, building);
    const flag = getFlagForBuilding(state, building.id);
    expect(flag).toMatchObject({ buildingId: building.id, x: 30, y: 32 });
    expect(state.flags).toHaveLength(2);
  });

  it('keeps automatic flag creation idempotent when synchronization runs', () => {
    const state = createGameState();
    prepareArea(state, 30, 30, 2, 2);
    const building = createBuilding('building-2', 'player', 'stonecutter_hut', '30-30');
    addBuilding(state, building);
    syncBuildingFlags(state);
    expect(state.flags).toHaveLength(2);
    expect(getFlagForBuilding(state, building.id)).toMatchObject({ x: 30, y: 32 });
  });

  it('destroys the building flag and its roads with the building', () => {
    const state = createGameState();
    prepareArea(state, 30, 30, 2, 2);
    const building = createBuilding('building-2', 'player', 'stonecutter_hut', '30-30');
    addBuilding(state, building);
    const buildingFlag = getFlagForBuilding(state, building.id);
    const headquartersFlag = getFlagForBuilding(state, state.buildings[0].id);
    const cells = ['50-52', '49-52', '48-52', '47-52', '46-52', '45-52', '44-52', '43-52', '42-52', '41-52', '40-52', '39-52', '38-52', '37-52', '36-52', '35-52', '34-52', '33-52', '32-52', '31-52', '30-52', '30-51', '30-50', '30-49', '30-48', '30-47', '30-46', '30-45', '30-44', '30-43', '30-42', '30-41', '30-40', '30-39', '30-38', '30-37', '30-36', '30-35', '30-34', '30-33', '30-32'];
    addRoad(state, createRoad('road-1', headquartersFlag.id, buildingFlag.id, cells));
    expect(areFlagsConnected(state, headquartersFlag.id, buildingFlag.id)).toBe(true);
    destroyBuilding(state, building.id);
    expect(state.buildings.find((item) => item.id === building.id)).toBeUndefined();
    expect(state.flags.find((item) => item.id === buildingFlag.id)).toBeUndefined();
    expect(state.roads).toHaveLength(0);
    expect(areFlagsConnected(state, headquartersFlag.id, buildingFlag.id)).toBe(false);
  });
});

describe('logistics road network', () => {
  it('keeps disconnected flags disconnected', () => {
    const state = createGameState();
    const headquartersFlag = getFlagForBuilding(state, state.buildings[0].id);
    prepareArea(state, 30, 30, 2, 2);
    const second = createBuilding('building-2', 'player', 'stonecutter_hut', '30-30');
    addBuilding(state, second);
    const secondFlag = getFlagForBuilding(state, second.id);
    rebuildLogisticsNetwork(state);
    expect(areFlagsConnected(state, headquartersFlag.id, secondFlag.id)).toBe(false);
    expect(findFlagRoute(state, headquartersFlag.id, secondFlag.id)).toBeNull();
  });

  it('finds a route through multiple road segments', () => {
    const state = createGameState();
    prepareArea(state, 30, 30, 2, 2);
    prepareArea(state, 20, 30, 2, 2);
    const first = createBuilding('building-2', 'player', 'stonecutter_hut', '30-30');
    const second = createBuilding('building-3', 'player', 'stonecutter_hut', '20-30');
    addBuilding(state, first);
    addBuilding(state, second);
    const hqFlag = getFlagForBuilding(state, state.buildings[0].id);
    const firstFlag = getFlagForBuilding(state, first.id);
    const secondFlag = getFlagForBuilding(state, second.id);
    addRoad(state, createRoad('road-1', hqFlag.id, firstFlag.id, ['50-52', '49-52', '48-52', '47-52', '46-52', '45-52', '44-52', '43-52', '42-52', '41-52', '40-52', '39-52', '38-52', '37-52', '36-52', '35-52', '34-52', '33-52', '32-52', '31-52', '30-52', '30-51', '30-50', '30-49', '30-48', '30-47', '30-46', '30-45', '30-44', '30-43', '30-42', '30-41', '30-40', '30-39', '30-38', '30-37', '30-36', '30-35', '30-34', '30-33', '30-32']));
    addRoad(state, createRoad('road-2', firstFlag.id, secondFlag.id, ['30-32', '29-32', '28-32', '27-32', '26-32', '25-32', '24-32', '23-32', '22-32', '21-32', '20-32']));
    const route = findFlagRoute(state, hqFlag.id, secondFlag.id);
    expect(route.flagIds).toEqual([hqFlag.id, firstFlag.id, secondFlag.id]);
    expect(route.roadIds).toEqual(['road-1', 'road-2']);
  });

  it('removes every road connected to a flag', () => {
    const state = createGameState();
    prepareArea(state, 30, 30, 2, 2);
    const building = createBuilding('building-2', 'player', 'stonecutter_hut', '30-30');
    addBuilding(state, building);
    const hqFlag = getFlagForBuilding(state, state.buildings[0].id);
    const buildingFlag = getFlagForBuilding(state, building.id);
    addRoad(state, createRoad('road-1', hqFlag.id, buildingFlag.id, ['50-52', '49-52', '48-52', '47-52', '46-52', '45-52', '44-52', '43-52', '42-52', '41-52', '40-52', '39-52', '38-52', '37-52', '36-52', '35-52', '34-52', '33-52', '32-52', '31-52', '30-52', '30-51', '30-50', '30-49', '30-48', '30-47', '30-46', '30-45', '30-44', '30-43', '30-42', '30-41', '30-40', '30-39', '30-38', '30-37', '30-36', '30-35', '30-34', '30-33', '30-32']));
    removeRoadsForFlag(state, buildingFlag.id);
    expect(state.roads).toHaveLength(0);
    expect(hqFlag.roadIds).toEqual([]);
  });
});
