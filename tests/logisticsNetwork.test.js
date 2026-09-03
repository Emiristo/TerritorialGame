import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { createBuilding, addBuilding } from '../src/game/buildings.js';
import { syncBuildingFlags, destroyBuilding } from '../src/game/buildingLogistics.js';
import { createFlag, addFlag, getFlagForBuilding } from '../src/game/flags.js';
import { addRoad, createRoad, removeRoadsForFlag } from '../src/game/roads.js';
import { areFlagsConnected, findFlagRoute, rebuildLogisticsNetwork } from '../src/game/logisticsNetwork.js';

function prepareArea(state, x, y, width, height) {
  for (let dy = 0; dy < height; dy += 1) for (let dx = 0; dx < width; dx += 1) {
    const tile = state.tiles.find((item) => item.x === x + dx && item.y === y + dy);
    tile.ownerId = 'player'; tile.terrain = 'plains';
  }
}
function diagonalPath(startX, startY, endX, endY) {
  const cells = [`${Math.floor(startX)}-${Math.floor(startY)}`]; let x = Math.floor(startX); let y = Math.floor(startY);
  const tx = Math.floor(endX); const ty = Math.floor(endY);
  while (x !== tx || y !== ty) { if (x !== tx) x += Math.sign(tx - x); if (y !== ty) y += Math.sign(ty - y); cells.push(`${x}-${y}`); }
  return cells;
}

describe('building logistics flags', () => {
  it('creates one flag for the headquarters on its south side', () => {
    const state = createGameState(); const headquarters = state.buildings[0]; const flag = getFlagForBuilding(state, headquarters.id);
    expect(state.flags).toHaveLength(1); expect(flag).toMatchObject({ buildingId: headquarters.id, ownerId: 'player', x: 50.5, y: 52 });
  });
  it('creates a building flag automatically when the building is added', () => {
    const state = createGameState(); prepareArea(state, 30, 30, 2, 2); const building = createBuilding('building-2', 'player', 'stonecutter_hut', '30-30'); addBuilding(state, building); const flag = getFlagForBuilding(state, building.id);
    expect(flag).toMatchObject({ buildingId: building.id, x: 31, y: 32 }); expect(state.flags).toHaveLength(2);
  });
  it('keeps automatic flag creation idempotent when synchronization runs', () => {
    const state = createGameState(); prepareArea(state, 30, 30, 2, 2); const building = createBuilding('building-2', 'player', 'stonecutter_hut', '30-30'); addBuilding(state, building); syncBuildingFlags(state);
    expect(state.flags).toHaveLength(2); expect(getFlagForBuilding(state, building.id)).toMatchObject({ x: 31, y: 32 });
  });
  it('preserves standalone flags when building flags are synchronized', () => {
    const state = createGameState(); const standalone = createFlag('standalone-1', null, 'player', 20, 20); addFlag(state, standalone); syncBuildingFlags(state);
    expect(state.flags).toHaveLength(2); expect(state.flags.find((flag) => flag.id === standalone.id)).toBe(standalone); expect(standalone.buildingId).toBeNull();
  });
  it('allows standalone flags to participate in the logistics network', () => {
    const state = createGameState(); const first = createFlag('standalone-1', null, 'player', 20, 20); const second = createFlag('standalone-2', null, 'player', 20, 25); addFlag(state, first); addFlag(state, second);
    addRoad(state, createRoad('standalone-road-1', first.id, second.id, ['20-20', '20-21', '20-22', '20-23', '20-24', '20-25']));
    expect(areFlagsConnected(state, first.id, second.id)).toBe(true); expect(findFlagRoute(state, first.id, second.id)).toEqual({ flagIds: [first.id, second.id], roadIds: ['standalone-road-1'] }); expect(first.roadIds).toEqual(['standalone-road-1']); expect(second.roadIds).toEqual(['standalone-road-1']);
  });
  it('destroys only the building flag and its roads, keeping standalone flags and their roads', () => {
    const state = createGameState(); prepareArea(state, 31, 31, 2, 2); const building = createBuilding('building-2', 'player', 'stonecutter_hut', '31-31'); addBuilding(state, building);
    const hqFlag = getFlagForBuilding(state, state.buildings[0].id); const buildingFlag = getFlagForBuilding(state, building.id); const standaloneA = createFlag('standalone-1', null, 'player', 20, 20); const standaloneB = createFlag('standalone-2', null, 'player', 20, 25); addFlag(state, standaloneA); addFlag(state, standaloneB);
    addRoad(state, createRoad('building-road', hqFlag.id, buildingFlag.id, diagonalPath(50.5, 52, 32, 33))); addRoad(state, createRoad('standalone-road', standaloneA.id, standaloneB.id, ['20-20', '20-21', '20-22', '20-23', '20-24', '20-25'])); expect(areFlagsConnected(state, standaloneA.id, standaloneB.id)).toBe(true);
    destroyBuilding(state, building.id);
    expect(state.flags.find((flag) => flag.id === buildingFlag.id)).toBeUndefined(); expect(state.flags.find((flag) => flag.id === standaloneA.id)).toBe(standaloneA); expect(state.flags.find((flag) => flag.id === standaloneB.id)).toBe(standaloneB); expect(state.roads).toEqual([expect.objectContaining({ id: 'standalone-road', startFlagId: standaloneA.id, endFlagId: standaloneB.id })]); expect(areFlagsConnected(state, standaloneA.id, standaloneB.id)).toBe(true); expect(areFlagsConnected(state, hqFlag.id, buildingFlag.id)).toBe(false);
  });
  it('destroys the building flag and its roads with the building', () => {
    const state = createGameState(); prepareArea(state, 31, 31, 2, 2); const building = createBuilding('building-2', 'player', 'stonecutter_hut', '31-31'); addBuilding(state, building); const buildingFlag = getFlagForBuilding(state, building.id); const headquartersFlag = getFlagForBuilding(state, state.buildings[0].id);
    addRoad(state, createRoad('road-1', headquartersFlag.id, buildingFlag.id, diagonalPath(50.5, 52, 32, 33))); expect(areFlagsConnected(state, headquartersFlag.id, buildingFlag.id)).toBe(true); destroyBuilding(state, building.id);
    expect(state.buildings.find((item) => item.id === building.id)).toBeUndefined(); expect(state.flags.find((item) => item.id === buildingFlag.id)).toBeUndefined(); expect(state.roads).toHaveLength(0); expect(areFlagsConnected(state, headquartersFlag.id, buildingFlag.id)).toBe(false);
  });
});

describe('logistics road network', () => {
  it('keeps disconnected flags disconnected', () => {
    const state = createGameState(); const headquartersFlag = getFlagForBuilding(state, state.buildings[0].id); prepareArea(state, 30, 30, 2, 2); const second = createBuilding('building-2', 'player', 'stonecutter_hut', '30-30'); addBuilding(state, second); const secondFlag = getFlagForBuilding(state, second.id); rebuildLogisticsNetwork(state);
    expect(areFlagsConnected(state, headquartersFlag.id, secondFlag.id)).toBe(false); expect(findFlagRoute(state, headquartersFlag.id, secondFlag.id)).toBeNull();
  });
  it('finds a route through multiple road segments', () => {
    const state = createGameState(); prepareArea(state, 31, 31, 2, 2); prepareArea(state, 20, 30, 2, 2); const first = createBuilding('building-2', 'player', 'stonecutter_hut', '31-31'); const second = createBuilding('building-3', 'player', 'stonecutter_hut', '20-30'); addBuilding(state, first); addBuilding(state, second);
    const hqFlag = getFlagForBuilding(state, state.buildings[0].id); const firstFlag = getFlagForBuilding(state, first.id); const secondFlag = getFlagForBuilding(state, second.id); addRoad(state, createRoad('road-1', hqFlag.id, firstFlag.id, diagonalPath(50.5, 52, 32, 33))); addRoad(state, createRoad('road-2', firstFlag.id, secondFlag.id, ['32-33', '31-32', '30-31', '29-31', '28-31', '27-31', '26-31', '25-31', '24-31', '23-31', '22-31', '21-31']));
    const route = findFlagRoute(state, hqFlag.id, secondFlag.id); expect(route.flagIds).toEqual([hqFlag.id, firstFlag.id, secondFlag.id]); expect(route.roadIds).toEqual(['road-1', 'road-2']);
  });
  it('removes every road connected to a flag', () => {
    const state = createGameState(); prepareArea(state, 31, 31, 2, 2); const building = createBuilding('building-2', 'player', 'stonecutter_hut', '31-31'); addBuilding(state, building); const hqFlag = getFlagForBuilding(state, state.buildings[0].id); const buildingFlag = getFlagForBuilding(state, building.id);
    addRoad(state, createRoad('road-1', hqFlag.id, buildingFlag.id, diagonalPath(50.5, 52, 32, 33))); removeRoadsForFlag(state, buildingFlag.id); expect(state.roads).toHaveLength(0); expect(hqFlag.roadIds).toEqual([]);
  });
});
