import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { createBuilding } from '../src/game/buildings.js';
import { advanceAllConstructions, deliverMaterialToConstructionFlag, startConstruction } from '../src/game/construction.js';
import { assignWorkerToBuilding } from '../src/game/workZones.js';
import { createWorker } from '../src/game/workers.js';

describe('building -> construction -> work zone -> worker', () => {
  it('creates a work zone on construction completion and assigns a compatible worker to it', () => {
    const state = createGameState();
    const building = createBuilding('lumberjack-1', 'player', 'lumberjack_hut', '45-45');
    building.flagId = `${building.id}-flag`;
    state.buildings.push(building);
    state.flags.push({ id: building.flagId, buildingId: building.id, ownerId: building.ownerId, x: 45, y: 45, constructionStorage: {} });
    state.player.resources.planks = 2;
    state.workers.push(createWorker('worker-1', 'player', 'lumberjack'));

    startConstruction(state, building);
    expect(deliverMaterialToConstructionFlag(state, building, 'planks', 2)).toBe(2);
    advanceAllConstructions(state, 19);

    expect(building.constructionComplete).toBe(false);
    expect(state.workZones).toEqual([]);

    advanceAllConstructions(state, 1);

    const zone = state.workZones.find((item) => item.buildingId === building.id);
    expect(zone).toMatchObject({
      buildingId: building.id,
      ownerId: 'player',
      centerTileId: building.tileId,
      radius: 5,
    });

    expect(assignWorkerToBuilding(state, 'worker-1', building.id, zone.id, '46-45')).toBe(true);
    expect(state.workers[0]).toMatchObject({
      buildingId: building.id,
      zoneId: zone.id,
      targetTileId: '46-45',
      state: 'working',
    });
    expect(building.workerIds).toContain('worker-1');
    expect(zone.workerIds).toContain('worker-1');
  });
});
