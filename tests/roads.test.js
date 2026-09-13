import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { createFlag, addFlag, removeFlag } from '../src/game/flags.js';
import { addRoad, buildRoadToNearestFlag, createRoad, findNearestFlag, findShortestRoadPaths, isRoadPathValid, recordRoadCargo, removeRoad, splitRoadAtNode } from '../src/game/roads.js';
import { addCarrier, createCarrier, createTransportRequest } from '../src/game/carriers.js';

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
  it('creates and keeps a persistent carrier for every road', () => {
    const state = createGameState(); addTestFlag(state, 'flag-carrier', 53, 52);
    const path = findShortestRoadPaths(state, 'headquarters-1-flag', 'flag-carrier')[0];
    const road = addRoad(state, createRoad('road-carrier-test', 'headquarters-1-flag', 'flag-carrier', path));
    const carriers = state.carriers.filter((carrier) => carrier.role === 'road' && carrier.roadId === road.id);
    expect(carriers).toHaveLength(1);
    const carrierId = carriers[0].id;
    recordRoadCargo(state, road.id, 200);
    expect(state.carriers.filter((carrier) => carrier.role === 'road' && carrier.roadId === road.id)).toHaveLength(2);
    expect(state.carriers.find((carrier) => carrier.id === carrierId)?.roadId).toBe(road.id);
  });
  it('rejects roads shorter than two cells and road intersections without a maximum length', () => {
    const state = createGameState(); addTestFlag(state, 'flag-a', 40, 50); addTestFlag(state, 'flag-b', 50, 50); addTestFlag(state, 'flag-long', 60, 50); addTestFlag(state, 'flag-c', 45, 45); addTestFlag(state, 'flag-d', 45, 55);
    expect(isRoadPathValid(state, { id: 'too-short', startFlagId: 'flag-a', endFlagId: 'flag-b', cells: ['40-50'], active: true })).toBe(false);
    const longRoad = Array.from({ length: 21 }, (_, i) => `${40 + i}-50`);
    expect(longRoad.length).toBe(21);
    expect(isRoadPathValid(state, { id: 'long-road', startFlagId: 'flag-a', endFlagId: 'flag-long', cells: longRoad, active: true })).toBe(true);
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

describe('road and flag lifecycle', () => {
  it('removing a flag removes connected roads and returns empty road carriers to the pool', () => {
    const state = createGameState(); addTestFlag(state, 'a', 1, 1); addTestFlag(state, 'b', 4, 1); addRoad(state, createRoad('road-a-b', 'a', 'b', ['1-1', '2-1', '3-1', '4-1']));
    const carrier = state.carriers.find((item) => item.roadId === 'road-a-b'); removeFlag(state, 'a');
    expect(state.worldMap.roads).toHaveLength(0); expect(carrier.roadId).toBeNull(); expect(carrier.cargo).toBeNull();
  });
  it('removing a road invalidates its route without deleting the transport request', () => {
    const state = createGameState(); addTestFlag(state, 'a', 1, 1); addTestFlag(state, 'b', 4, 1); addRoad(state, createRoad('road-a-b', 'a', 'b', ['1-1', '2-1', '3-1', '4-1']));
    const request = createTransportRequest('request-1', 'player', 'stone', 1, 'a', 'b'); request.routeFlagIds = ['a', 'b']; request.routeRoadIds = ['road-a-b']; state.transportRequests.push(request);
    removeRoad(state, 'road-a-b');
    expect(state.transportRequests).toContain(request); expect(request.state).toBe('blocked'); expect(request.routeRoadIds).toEqual([]); expect(state.worldMap.roads).toHaveLength(0);
  });
  it('removing a road preserves cargo already carried by a carrier', () => {
    const state = createGameState(); addTestFlag(state, 'a', 1, 1); addTestFlag(state, 'b', 4, 1); addRoad(state, createRoad('road-a-b', 'a', 'b', ['1-1', '2-1', '3-1', '4-1']));
    const carrier = state.carriers.find((item) => item.roadId === 'road-a-b'); carrier.cargo = { requestId: 'request-1', resourceId: 'stone', amount: 1, fromFlagId: 'a', toFlagId: 'b', roadId: 'road-a-b', segmentIndex: 0 }; carrier.state = 'carrying';
    const request = createTransportRequest('request-1', 'player', 'stone', 1, 'a', 'b'); request.inTransit = 1; request.routeFlagIds = ['a', 'b']; request.routeRoadIds = ['road-a-b']; request.state = 'inTransit'; state.transportRequests.push(request);
    removeRoad(state, 'road-a-b');
    expect(carrier.roadId).toBeNull(); expect(carrier.cargo.resourceId).toBe('stone'); expect(request.inTransit).toBe(1); expect(request.state).toBe('blocked');
  });
  it('splitting a road keeps existing carriers on the original side and provisions a new carrier for the new segment', () => {
    const state = createGameState(); addTestFlag(state, 'a', 1, 1); addTestFlag(state, 'b', 6, 1); addTestFlag(state, 'split', 4, 1);
    const road = addRoad(state, createRoad('road-a-b', 'a', 'b', ['1-1', '2-1', '3-1', '4-1', '5-1', '6-1']));
    const existingCarrier = state.carriers.find((item) => item.role === 'road' && item.roadId === road.id);
    const roads = splitRoadAtNode(state, road.id, 4, 1, { flagId: 'split' });
    expect(roads).toHaveLength(2); expect(existingCarrier.roadId).toBe(roads[0].id); expect(existingCarrier.roadId).not.toBe(roads[1].id);
    const newSegmentCarriers = state.carriers.filter((item) => item.role === 'road' && item.roadId === roads[1].id);
    expect(newSegmentCarriers).toHaveLength(1); expect(newSegmentCarriers[0]).not.toBe(existingCarrier);
  });
  it('uses an idle road carrier from the pool before creating another carrier for a new road', () => {
    const state = createGameState(); addTestFlag(state, 'a', 1, 1); addTestFlag(state, 'b', 4, 1); const pooled = createCarrier('pooled-carrier', 'player'); addCarrier(state, pooled);
    addRoad(state, createRoad('road-a-b', 'a', 'b', ['1-1', '2-1', '3-1', '4-1']));
    expect(pooled.roadId).toBe('road-a-b');
  });
});
