import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { BUILDING_TYPES, addBuilding } from '../src/game/buildings.js';
import { advanceAllConstructions, deliverMaterialToConstructionFlag, startConstruction } from '../src/game/construction.js';
import {
  createWorkZone, createWorkZoneForBuilding, getWorkZoneCells, getWorkZoneForBuilding, getWorkZoneRadius, getWorkZoneSpec,
  isTileInWorkZone, assignWorkerToBuilding, assignWorkerToWorkZone, removeWorkZoneForBuilding, syncWorkZones,
} from '../src/game/workZones.js';
import { createWorker } from '../src/game/workers.js';

function place(state, id, typeId, tileId = '30-30') {
  const [x, y] = tileId.split('-').map(Number);
  const type = BUILDING_TYPES[Object.keys(BUILDING_TYPES).find((key) => BUILDING_TYPES[key].id === typeId)];
  for (let dy = 0; dy < type.height; dy += 1) for (let dx = 0; dx < type.width; dx += 1) {
    const tile = state.tiles.find((item) => item.x === x + dx && item.y === y + dy);
    tile.ownerId = state.player.id;
    tile.terrain = 'plains';
  }
  return addBuilding(state, id, state.player.id, typeId, tileId);
}

describe('work zones', () => {
  it('creates an external radius zone for a resource-working building', () => {
    const state = createGameState();
    const building = place(state, 'lumberjack', 'lumberjack_hut');
    expect(createWorkZoneForBuilding(state, building.id)).toBeNull();
    building.active = true;
    building.constructionComplete = true;
    const zone = createWorkZoneForBuilding(state, building.id);
    expect(zone).toMatchObject({ buildingId: building.id, ownerId: 'player', centerTileId: '30-30', radius: 5, mode: 'radius' });
    expect(zone.workerIds).toEqual([]);
  });

  it('creates a footprint-sized zone for buildings whose work is inside the building', () => {
    const state = createGameState();
    const building = place(state, 'sawmill', 'sawmill', '30-30');
    building.active = true;
    building.constructionComplete = true;
    expect(getWorkZoneSpec(state, building)).toEqual({ mode: 'footprint' });
    expect(getWorkZoneRadius(state, building)).toBeNull();
    const zone = createWorkZoneForBuilding(state, building.id);
    expect(zone).toMatchObject({ buildingId: building.id, mode: 'footprint', radius: null });
    expect(getWorkZoneCells(state, zone).map((tile) => tile.id)).toEqual(['30-30', '31-30', '30-31', '31-31', '30-32', '31-32']);
  });

  it('uses the full building footprint for the farm work zone', () => {
    const state = createGameState();
    const building = place(state, 'farm', 'farm', '30-30');
    building.active = true;
    building.constructionComplete = true;
    const zone = createWorkZoneForBuilding(state, building.id);
    expect(zone).toMatchObject({ mode: 'footprint' });
    expect(getWorkZoneCells(state, zone)).toHaveLength(16);
    expect(isTileInWorkZone(state, zone.id, '33-33')).toBe(true);
    expect(isTileInWorkZone(state, zone.id, '34-34')).toBe(false);
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
    const active = place(state, 'active', 'lumberjack_hut', '30-30');
    active.active = true;
    active.constructionComplete = true;
    const inactive = place(state, 'inactive', 'lumberjack_hut', '40-40');
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

  it('runs the full chain: physical delivery, construction completion, work zone and worker assignment', () => {
    const state = createGameState();
    const building = place(state, 'lumberjack-1', 'lumberjack_hut');
    state.player.resources.planks = 2;
    state.workers.push(createWorker('worker-1', 'player', 'lumberjack'));

    startConstruction(state, building);
    expect(deliverMaterialToConstructionFlag(state, building, 'planks', 2)).toBe(2);
    advanceAllConstructions(state, 20);

    expect(building).toMatchObject({ active: true, constructionComplete: true, constructionState: 'COMPLETED' });
    const zone = getWorkZoneForBuilding(state, building.id);
    expect(zone).toMatchObject({ buildingId: building.id, ownerId: 'player', radius: 5, mode: 'radius' });
    expect(assignWorkerToBuilding(state, 'worker-1', building.id, zone.id, '31-31')).toBe(true);
    expect(state.workers[0]).toMatchObject({ buildingId: building.id, zoneId: zone.id, targetTileId: '31-31', state: 'working' });
    expect(zone.workerIds).toEqual(['worker-1']);
    expect(building.workerIds).toEqual(['worker-1']);
  });
});
