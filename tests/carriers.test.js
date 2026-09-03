import { describe, expect, it } from 'vitest';
import { createFlag } from '../src/game/flags.js';
import { createRoad, addRoad, getRoadCarrierCapacity, getRoadLevel } from '../src/game/roads.js';
import { rebuildLogisticsNetwork } from '../src/game/logisticsNetwork.js';
import {
  CARRIER_STATES,
  createCarrier,
  createTransportRequest,
  addCarrier,
  addCargoToFlag,
  getFlagCargo,
  advanceCarrier,
} from '../src/game/carriers.js';

function makeState() {
  const tiles = [];
  for (let y = 0; y < 20; y += 1) for (let x = 0; x < 20; x += 1) tiles.push({ id: `${x}-${y}`, x, y });
  return { player: { id: 'player' }, tiles, flags: [], roads: [], carriers: [], transportRequests: [] };
}

function addTestFlag(state, id, x, y) {
  state.flags.push(createFlag(id, null, 'player', x, y));
}

function addTestRoad(state, id, start, end, cells) {
  addRoad(state, createRoad(id, start, end, cells));
}

describe('carrier logistics', () => {
  it('moves one cargo unit from one flag to the next flag', () => {
    const state = makeState();
    addTestFlag(state, 'a', 1, 1);
    addTestFlag(state, 'b', 4, 1);
    addTestRoad(state, 'road-a-b', 'a', 'b', ['1-1', '2-1', '3-1', '4-1']);
    addCarrier(state, createCarrier('carrier-1', 'player', 'road-a-b'));
    const request = createTransportRequest('request-1', 'player', 'stone', 1, 'a', 'b');
    state.transportRequests.push(request);
    addCargoToFlag(state, 'a', 'stone', 1);

    expect(advanceCarrier(state, 'carrier-1', 'request-1')).toBe(true);
    expect(state.carriers[0].state).toBe(CARRIER_STATES.CARRYING);
    expect(getFlagCargo(state, 'a', 'stone')).toBe(0);

    expect(advanceCarrier(state, 'carrier-1', 'request-1')).toBe(true);
    expect(getFlagCargo(state, 'b', 'stone')).toBe(1);
    expect(request.delivered).toBe(1);
    expect(request.state).toBe('delivered');
  });

  it('passes cargo through multiple flag-to-flag carriers without teleporting to the destination', () => {
    const state = makeState();
    addTestFlag(state, 'a', 1, 1);
    addTestFlag(state, 'b', 4, 1);
    addTestFlag(state, 'c', 7, 1);
    addTestRoad(state, 'road-a-b', 'a', 'b', ['1-1', '2-1', '3-1', '4-1']);
    addTestRoad(state, 'road-b-c', 'b', 'c', ['4-1', '5-1', '6-1', '7-1']);
    addCarrier(state, createCarrier('carrier-ab', 'player', 'road-a-b'));
    addCarrier(state, createCarrier('carrier-bc', 'player', 'road-b-c'));
    rebuildLogisticsNetwork(state);
    const request = createTransportRequest('request-1', 'player', 'stone', 1, 'a', 'c');
    state.transportRequests.push(request);
    addCargoToFlag(state, 'a', 'stone', 1);

    expect(advanceCarrier(state, 'carrier-ab', 'request-1')).toBe(true);
    expect(advanceCarrier(state, 'carrier-ab', 'request-1')).toBe(true);
    expect(getFlagCargo(state, 'b', 'stone')).toBe(1);
    expect(getFlagCargo(state, 'c', 'stone')).toBe(0);
    expect(request.delivered).toBe(0);

    expect(advanceCarrier(state, 'carrier-bc', 'request-1')).toBe(true);
    expect(advanceCarrier(state, 'carrier-bc', 'request-1')).toBe(true);
    expect(getFlagCargo(state, 'c', 'stone')).toBe(1);
    expect(request.delivered).toBe(1);
  });

  it('does not load cargo when source and destination are disconnected', () => {
    const state = makeState();
    addTestFlag(state, 'a', 1, 1);
    addTestFlag(state, 'b', 4, 1);
    addCarrier(state, createCarrier('carrier-1', 'player', null));
    const request = createTransportRequest('request-1', 'player', 'stone', 1, 'a', 'b');
    state.transportRequests.push(request);
    addCargoToFlag(state, 'a', 'stone', 1);

    expect(advanceCarrier(state, 'carrier-1', 'request-1')).toBe(false);
    expect(getFlagCargo(state, 'a', 'stone')).toBe(1);
  });

  it('upgrades a road every 200 successfully transported cargo units up to level 3', () => {
    const state = makeState();
    addTestFlag(state, 'a', 1, 1);
    addTestFlag(state, 'b', 4, 1);
    addTestRoad(state, 'road-a-b', 'a', 'b', ['1-1', '2-1', '3-1', '4-1']);
    const road = state.roads[0];

    expect(getRoadLevel(state, road.id)).toBe(1);
    expect(getRoadCarrierCapacity(state, road.id)).toBe(1);
    for (let i = 0; i < 199; i += 1) {
      road.transportedCargo += 1;
    }
    expect(getRoadLevel(state, road.id)).toBe(1);
    expect(getRoadCarrierCapacity(state, road.id)).toBe(1);

    road.transportedCargo += 1;
    expect(getRoadLevel(state, road.id)).toBe(2);
    expect(getRoadCarrierCapacity(state, road.id)).toBe(2);

    road.transportedCargo = 400;
    expect(getRoadLevel(state, road.id)).toBe(3);
    expect(getRoadCarrierCapacity(state, road.id)).toBe(3);
    road.transportedCargo = 1000;
    expect(getRoadLevel(state, road.id)).toBe(3);
  });

  it('allows independent carriers on the same road only after the road reaches the required level', () => {
    const state = makeState();
    addTestFlag(state, 'a', 1, 1);
    addTestFlag(state, 'b', 4, 1);
    addTestRoad(state, 'road-a-b', 'a', 'b', ['1-1', '2-1', '3-1', '4-1']);
    const road = state.roads[0];

    addCarrier(state, createCarrier('carrier-1', 'player', road.id));
    expect(() => addCarrier(state, createCarrier('carrier-2', 'player', road.id))).toThrow('carrier capacity');

    road.transportedCargo = 200;
    expect(getRoadCarrierCapacity(state, road.id)).toBe(2);
    addCarrier(state, createCarrier('carrier-2', 'player', road.id));
    expect(state.carriers.filter((carrier) => carrier.roadId === road.id)).toHaveLength(2);

    road.transportedCargo = 400;
    addCarrier(state, createCarrier('carrier-3', 'player', road.id));
    expect(state.carriers.filter((carrier) => carrier.roadId === road.id)).toHaveLength(3);
    expect(() => addCarrier(state, createCarrier('carrier-4', 'player', road.id))).toThrow('carrier capacity');
  });
});
