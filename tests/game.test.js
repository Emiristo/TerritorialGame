import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { BUILDING_TYPES, canBuildOnTile, getFootprintTiles } from '../src/game/buildings.js';
import { INFLUENCE_RADIUS, isWithinInfluenceRadius } from '../src/game/influence.js';
import { WORKER_TYPES, createWorker, createWorkZone, assignWorkerToBuilding } from '../src/game/workers.js';
import { createTerritorySource, addTerritorySource, getOwnedTiles } from '../src/game/territory.js';

