import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { createBuilding } from '../src/game/buildings.js';
import { advanceAllConstructions, deliverMaterialAndStartConstruction } from '../src/game/construction.js';
import {
  createWorkZone,
  createWorkZoneForBuilding,
  getWorkZoneCells,
  getWorkZoneForBuilding,
  getWorkZoneRadius,
  isTileInWorkZone,
  assignWorkerToBuilding,
  assignWorkerToWorkZone,
  removeWorkZoneForBuilding,
  syncWorkZones,
} from '../src/game/workZones.js';
import { createWorker } from '../src/game/workers.js';

describe('work zones', () => {
  it('creates a zone only for an active building with workRadius', () => {
    const state = createGameState();
    const building = createBuilding('lumberjack', 'player', 'lumberjack_hut', '30-30');
    state.buildings.push(building);
    expect(createWorkZoneForBuilding(state, building.id)).toBeNull();
    building.active = true;
    building.constructionComplete = true;
    const zone = createWorkZoneForBuilding(state, building.id);
    expect(zone).toMatchObject({ buildingId: building.id, ownerId: 'player', centerTileId: '30-30', radius: 5 });
    expect(zone.workerIds).toEqual([]);
  });

  it('does not create a zone for buildings without workRadius', () => {
    const state = createGameState();
    const building = createBuilding('sawmill', 'player', 'sawmill', '30-30');
    building.active = true;
    building.constructionComplete = true;
    state.buildings.push(building);
    expect(getWorkZoneRadius(state, building)).toBeNull();
    expect(createWorkZoneForBuilding(state, building.id)).toBeNull();
    expect(state.workZones).toEqual([]);
  });

  it('uses Chebyshev radius and stays inside map boundaries', () => {
    const state = createGameState();
    const zone = createWorkZone('z', 'player', 'b', '0-0', 2);
    const cells = getWorkZoneCells(state, zone);
    expect(cells).toHaveLength(9);
    expect(cells.map((tile) => tile.id)).toEqual(expect.arrayContaining(['0-0', '1-1', '2-2']));
    expect(cells.some((tile) => tile.x < 0 || tile.y < 0)).toBe(false);
  });

  it('allows work zones to overlap', () => {
    const state = createGameState();
    const first = createWorkZone('z1', 'player', 'b1', '50-50', 2);
    const second = createWorkZone('z2', 'player', 'b2', '52-50', 2);
    state.workZones.push(first, second);
    expect(isTileInWorkZone(state, first.id, '51-50')).toBe(true);
    expect(isTileInWorkZone(state, second.id, '51-50')).toBe(true);
    expect(state.workZones).toHaveLength(2);
  });

  it('reports cells by id and membership', () => {
    const state = createGameState();
    state.workZones.push(createWorkZone('z', 'player', 'b', '50-50', 1));
    expect(getWorkZoneForBuilding(state, 'b').id).toBe('z');
    expect(isTileInWorkZone(state, 'z', '51-51')).toBe(true);
    expect(isTileInWorkZone(state, 'z', '52-52')).toBe(false);
  });

  it('assigns a worker to one owned zone and removes previous assignment', () => {
    const state = createGameState();
    state.workZones.push(createWorkZone('z1', 'player', 'b1', '50-50', 1));
    state.workZones.push(createWorkZone('z2', 'player', 'b2', '60-60', 1));
    state.workers.push(createWorker('w', 'player', 'lumberjack'));
    expect(assignWorkerToWorkZone(state, 'w', 'z1')).toBe(true);
    expect(assignWorkerToWorkZone(state, 'w', 'z2')).toBe(true);
    expect(state.workZones[0].workerIds).toEqual([]);
    expect(state.workZones[1].workerIds).toEqual(['w']);
    expect(state.workers[0]).toMatchObject({ zoneId: 'z2', state: 'working' });
  });

  it('rejects assigning a worker to another owner zone', () => {
    const state = createGameState();
    state.workZones.push(createWorkZone('z', 'other', 'b', '50-50', 1));
    state.workers.push(createWorker('w', 'player', 'lumberjack'));
    expect(assignWorkerToWorkZone(state, 'w', 'z')).toBe(false);
    expect(state.workers[0].zoneId).toBeNull();
  });

  it('syncs zones with active buildings and removes obsolete zones', () => {
    const state = createGameState();
    const active = createBuilding('active', 'player', 'lumberjack_hut', '30-30');
    active.active = true;
    active.constructionComplete = true;
    const inactive = createBuilding('inactive', 'player', 'lumberjack_hut', '40-40');
    state.buildings.push(active, inactive);
    state.workZones.push(createWorkZone('obsolete', 'player', inactive.id, inactive.tileId, 5));
    syncWorkZones(state);
    expect(getWorkZoneForBuilding(state, active.id)).not.toBeNull();
    expect(getWorkZoneForBuilding(state, inactive.id)).toBeNull();
  });

  it('cleans worker assignment when a building zone is removed', () => {
    const state = createGameState();
    const zone = createWorkZone('z', 'player', 'b', '50-50', 1);
    state.workZones.push(zone);
    const worker = createWorker('w', 'player', 'lumberjack');
    state.workers.push(worker);
    assignWorkerToWorkZone(state, worker.id, zone.id);
    expect(removeWorkZoneForBuilding(state, 'b')).toBe(true);
    expect(state.workZones).toEqual([]);
    expect(worker).toMatchObject({ zoneId: null, state: 'idle' });
  });

  it('runs the full chain: building completion creates a zone and the correct worker can be assigned', () => {
    const state = createGameState();
    const building = createBuilding('lumberjack-1', 'player', 'lumberjack_hut', '30-30');
    state.buildings.push(building);
    state.workers.push(createWorker('worker-1', 'player', 'lumberjack'));

    expect(deliverMaterialAndStartConstruction(building, 'planks', 2)).toBe(2);
    advanceAllConstructions(state, 20);

    expect(building).toMatchObject({ active: true, constructionComplete: true, constructionState: 'COMPLETED' });
    const zone = getWorkZoneForBuilding(state, building.id);
    expect(zone).toMatchObject({ buildingId: building.id, ownerId: 'player', radius: 5 });
    expect(assignWorkerToBuilding(state, 'worker-1', building.id, zone.id, '31-31')).toBe(true);
    expect(state.workers[0]).toMatchObject({ buildingId: building.id, zoneId: zone.id, targetTileId: '31-31', state: 'working' });
    expect(zone.workerIds).toEqual(['worker-1']);
    expect(building.workerIds).toEqual(['worker-1']);
  });
});
