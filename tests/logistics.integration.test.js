import { describe, expect, it } from 'vitest';
import { createFlag } from '../src/game/flags.js';
import { createRoad, addRoad } from '../src/game/roads.js';
import {
  CARRIER_STATES,
  createCarrier,
  addCarrier,
  getBuildingInventory,
  getFlagCargo,
  advanceCarrier,
} from '../src/game/carriers.js';
import { createWorker, extractForWorker } from '../src/game/workers.js';

function makeState() {
  const tiles = [];
  for (let y = 0; y < 20; y += 1) for (let x = 0; x < 20; x += 1) {
    tiles.push({ id: `${x}-${y}`, x, y, terrain: x === 2 ? 'hills' : 'plains', resources: {} });
  }
  tiles.find((tile) => tile.id === '2-2').resources.stone = 1;
  return {
    player: { id: 'player', resources: {} },
    tiles,
    flags: [],
    roads: [],
    buildings: [
      { id: 'mine', ownerId: 'player', typeId: 'mine', tileId: '2-2', active: true, inventory: {} },
      { id: 'workshop', ownerId: 'player', typeId: 'workshop', tileId: '7-2', active: true, inventory: {} },
    ],
    buildingTypes: [
      { id: 'mine', role: 'extraction', output: { resourceId: 'stone', amount: 1 } },
      { id: 'workshop', role: 'production', input: { stone: 1 } },
    ],
    workZones: [{ id: 'zone-mine', buildingId: 'mine', centerTileId: '2-2', radius: 5 }],
    workers: [],
    carriers: [],
    transportRequests: [],
  };
}

describe('real resource logistics chain', () => {
  it('moves extracted resource from mine building to destination building through flags and roads', () => {
    const state = makeState();
    state.flags.push(createFlag('mine-flag', 'mine', 'player', 2, 4));
    state.flags.push(createFlag('workshop-flag', 'workshop', 'player', 7, 4));
    addRoad(state, createRoad('road-mine-workshop', 'mine-flag', 'workshop-flag', ['2-3', '3-3', '4-3', '5-3', '6-3', '7-3']));

    const worker = createWorker('miner-1', 'player', 'miner');
    worker.buildingId = 'mine';
    worker.zoneId = 'zone-mine';
    state.workers.push(worker);

    expect(extractForWorker(state, 'miner-1')).toBe(true);
    expect(getBuildingInventory(state, 'mine', 'stone')).toBe(0);
    expect(getFlagCargo(state, 'mine-flag', 'stone')).toBe(1);
    expect(state.transportRequests).toHaveLength(1);

    addCarrier(state, createCarrier('carrier-1', 'player', 'road-mine-workshop'));
    const request = state.transportRequests[0];

    expect(advanceCarrier(state, 'carrier-1', request.id)).toBe(true);
    expect(state.carriers[0].state).toBe(CARRIER_STATES.CARRYING);
    expect(getFlagCargo(state, 'mine-flag', 'stone')).toBe(0);

    expect(advanceCarrier(state, 'carrier-1', request.id)).toBe(true);
    expect(getFlagCargo(state, 'workshop-flag', 'stone')).toBe(0);
    expect(getBuildingInventory(state, 'workshop', 'stone')).toBe(1);
    expect(request.delivered).toBe(1);
    expect(request.state).toBe('delivered');
  });
});
