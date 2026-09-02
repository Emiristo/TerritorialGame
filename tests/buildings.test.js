import { describe, expect, it } from 'vitest';
import {
  BUILDING_TYPES,
  addBuilding,
  canBuildOnTile,
  createBuilding,
  getBuildingAtTile,
  getBuildingType,
  getConstructionMaterials,
  getFootprintTiles,
  getReservedTiles,
  isReservedForBuilding,
} from '../src/game/buildings.js';
import { createGameState } from '../src/game/state.js';
import {
  BUILD_TIME_PER_PLANK,
  BUILD_TIME_PER_STONE,
  CONSTRUCTION_STATES,
  advanceAllConstructions,
  advanceConstruction,
  beginConstructionWaiting,
  completeConstruction,
  deliverMaterialAndStartConstruction,
  getConstructionTime,
  startConstruction,
} from '../src/game/construction.js';
import { deliverConstructionMaterial } from '../src/game/materials.js';

function tile(state, x, y) {
  return state.tiles.find((item) => item.x === x && item.y === y);
}

function prepareArea(state, x, y, width, height, { ownerId = 'player', terrain = 'plains' } = {}) {
  for (let dy = 0; dy < height; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      const current = tile(state, x + dx, y + dy);
      current.ownerId = ownerId;
      current.terrain = terrain;
    }
  }
}

describe('building catalog', () => {
  it('contains the complete agreed catalog of 21 building types', () => {
    expect(Object.keys(BUILDING_TYPES)).toHaveLength(21);
    expect(new Set(Object.values(BUILDING_TYPES).map((type) => type.id)).size).toBe(21);
  });

  it('keeps the agreed geometry and construction costs for every building', () => {
    const expected = {
      headquarters: [3, 3, {}],
      warehouse: [3, 3, { planks: 3, stone: 3 }],
      forester_hut: [2, 2, { planks: 2 }],
      stonecutter_hut: [2, 2, { planks: 2 }],
      sawmill: [2, 3, { planks: 2, stone: 2 }],
      well: [2, 2, { planks: 2 }],
      farm: [4, 4, { planks: 4, stone: 3 }],
      mill: [2, 2, { planks: 2, stone: 2 }],
      bakery: [2, 2, { planks: 2, stone: 2 }],
      coal_mine: [2, 2, { planks: 4 }],
      iron_mine: [2, 2, { planks: 4 }],
      gold_mine: [2, 2, { planks: 4 }],
      marble_mine: [2, 2, { planks: 4 }],
      foundry: [2, 2, { planks: 2, stone: 2 }],
      forge: [2, 2, { planks: 2, stone: 2 }],
      workshop: [3, 3, { planks: 2, stone: 2 }],
      mint: [2, 2, { planks: 2, stone: 2 }],
      outpost: [2, 2, { planks: 3 }],
      barracks: [3, 3, { planks: 3, stone: 1 }],
      watchtower: [2, 2, { planks: 5, stone: 5 }],
      fortress: [5, 5, { planks: 10, stone: 10 }],
    };

    for (const [id, [width, height, materials]] of Object.entries(expected)) {
      const type = Object.values(BUILDING_TYPES).find((item) => item.id === id);
      expect(type).toBeDefined();
      expect([type.width, type.height]).toEqual([width, height]);
      expect(type.constructionMaterials).toEqual(materials);
    }
  });

  it('returns a defensive copy of construction materials', () => {
    const building = createBuilding('warehouse-1', 'player', 'warehouse', '30-30');
    const materials = getConstructionMaterials(building);
    materials.planks = 999;
    expect(getConstructionMaterials(building)).toEqual({ planks: 3, stone: 3 });
    expect(getBuildingType(building).id).toBe('warehouse');
  });
});

describe('building geometry and placement', () => {
  it('returns the exact footprint dimensions for representative buildings', () => {
    const state = createGameState();
    expect(getFootprintTiles(state, 'warehouse', '30-30')).toHaveLength(9);
    expect(getFootprintTiles(state, 'sawmill', '30-30')).toHaveLength(6);
    expect(getFootprintTiles(state, 'farm', '30-30')).toHaveLength(16);
    expect(getFootprintTiles(state, 'fortress', '30-30')).toHaveLength(25);
  });

  it('rejects footprints that cross the map boundary', () => {
    const state = createGameState();
    expect(getFootprintTiles(state, 'warehouse', '98-98')).toEqual([]);
    expect(getFootprintTiles(state, 'fortress', '96-96')).toHaveLength(25);
    expect(getFootprintTiles(state, 'fortress', '97-96')).toEqual([]);
  });

  it('requires every footprint tile to belong to the builder', () => {
    const state = createGameState();
    prepareArea(state, 30, 30, 3, 3);
    expect(canBuildOnTile(state, 'warehouse', '30-30')).toBe(true);
    tile(state, 31, 31).ownerId = 'other-player';
    expect(canBuildOnTile(state, 'warehouse', '30-30')).toBe(false);
  });

  it('requires suitable terrain across the complete footprint', () => {
    const state = createGameState();
    prepareArea(state, 30, 30, 2, 2, { terrain: 'plains' });
    expect(canBuildOnTile(state, 'stonecutter_hut', '30-30')).toBe(true);
    tile(state, 31, 31).terrain = 'forest';
    expect(canBuildOnTile(state, 'stonecutter_hut', '30-30')).toBe(false);

    prepareArea(state, 40, 40, 2, 2, { terrain: 'hills' });
    expect(canBuildOnTile(state, 'iron_mine', '40-40')).toBe(true);
    tile(state, 41, 41).terrain = 'plains';
    expect(canBuildOnTile(state, 'iron_mine', '40-40')).toBe(false);
  });

  it('allows mines on hills and mountains but not on plains', () => {
    const state = createGameState();
    prepareArea(state, 40, 40, 2, 2, { terrain: 'hills' });
    expect(canBuildOnTile(state, 'coal_mine', '40-40')).toBe(true);
    prepareArea(state, 50, 40, 2, 2, { terrain: 'mountains' });
    expect(canBuildOnTile(state, 'coal_mine', '50-40')).toBe(true);
    prepareArea(state, 60, 40, 2, 2, { terrain: 'plains' });
    expect(canBuildOnTile(state, 'coal_mine', '60-40')).toBe(false);
  });

  it('blocks occupied footprints and footprints inside another reservation', () => {
    const state = createGameState();
    prepareArea(state, 30, 30, 2, 2);
    const first = createBuilding('first', 'player', 'stonecutter_hut', '30-30');
    addBuilding(state, first);
    expect(getBuildingAtTile(state, '30-30')).toBe(first);
    expect(canBuildOnTile(state, 'stonecutter_hut', '30-30')).toBe(false);
    prepareArea(state, 32, 30, 2, 2);
    expect(isReservedForBuilding(state, '32-30')).toBe(true);
    expect(canBuildOnTile(state, 'stonecutter_hut', '32-30')).toBe(false);
  });

  it('creates a one-cell Chebyshev reservation ring and permits overlapping reservations', () => {
    const state = createGameState();
    const reservation = getReservedTiles(state, 'stonecutter_hut', '30-30');
    expect(reservation).toHaveLength(12);
    expect(reservation.some((item) => item.id === '29-29')).toBe(true);
    expect(reservation.some((item) => item.id === '32-32')).toBe(true);
    expect(reservation.some((item) => item.id === '30-30')).toBe(false);

    prepareArea(state, 30, 30, 2, 2);
    prepareArea(state, 33, 33, 2, 2);
    addBuilding(state, createBuilding('first', 'player', 'stonecutter_hut', '30-30'));
    expect(canBuildOnTile(state, 'stonecutter_hut', '33-33')).toBe(true);
    addBuilding(state, createBuilding('second', 'player', 'stonecutter_hut', '33-33'));
    expect(isReservedForBuilding(state, '32-32')).toBe(true);
  });

  it('throws when addBuilding is used for an invalid placement', () => {
    const state = createGameState();
    const building = createBuilding('invalid', 'player', 'warehouse', '30-30');
    expect(() => addBuilding(state, building)).toThrow('Building cannot be placed');
  });
});

describe('construction mechanics', () => {
  it('calculates total construction time from material units', () => {
    expect(getConstructionTime({ planks: 3, stone: 2 })).toBe(60);
    expect(getConstructionTime({ planks: 4 })).toBe(40);
    expect(getConstructionTime({ stone: 3 })).toBe(45);
  });

  it('uses one independent timer per delivered material unit', () => {
    const state = createGameState();
    const building = createBuilding('stonecutter-1', 'player', 'stonecutter_hut', '30-30');
    state.buildings.push(building);
    state.player.resources.planks = 2;
    deliverConstructionMaterial(state, building.id, 'planks', 2);
    expect(building.constructionQueue).toEqual(['planks']);
    expect(building.constructionMaterialsDelivered.planks).toBe(2);
    advanceConstruction(building, 10);
    expect(building.currentConstructionMaterial).toBe('planks');
    expect(building.constructionTimer).toBe(10);
    advanceConstruction(building, 10);
    expect(building.constructionComplete).toBe(true);
    expect(building.active).toBe(true);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.COMPLETED);
  });

  it('transitions between waiting and building as materials arrive', () => {
    const state = createGameState();
    const building = createBuilding('warehouse-1', 'player', 'warehouse', '30-30');
    state.buildings.push(building);
    startConstruction(state, building, 1000);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.PLACED);
    beginConstructionWaiting(building);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL);
    state.player.resources.planks = 1;
    deliverConstructionMaterial(state, building.id, 'planks', 1);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.BUILDING);
    advanceConstruction(building, BUILD_TIME_PER_PLANK);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL);
    expect(building.constructionComplete).toBe(false);
  });

  it('processes queued mixed materials in delivery order with their own rates', () => {
    const state = createGameState();
    const building = createBuilding('warehouse-1', 'player', 'warehouse', '30-30');
    state.buildings.push(building);
    state.player.resources.planks = 1;
    state.player.resources.stone = 1;
    deliverConstructionMaterial(state, building.id, 'planks', 1);
    deliverConstructionMaterial(state, building.id, 'stone', 1);
    advanceConstruction(building, BUILD_TIME_PER_PLANK);
    expect(building.currentConstructionMaterial).toBe('stone');
    expect(building.constructionTimer).toBe(BUILD_TIME_PER_STONE);
    advanceConstruction(building, BUILD_TIME_PER_STONE);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.WAITING_FOR_MATERIAL);
    expect(building.constructionComplete).toBe(false);
  });

  it('rejects over-delivery, unavailable stock, invalid amounts, and unknown material requirements', () => {
    const state = createGameState();
    const building = createBuilding('stonecutter-1', 'player', 'stonecutter_hut', '30-30');
    state.buildings.push(building);
    state.player.resources.planks = 1;
    expect(deliverConstructionMaterial(state, building.id, 'planks', 5)).toBe(1);
    expect(deliverConstructionMaterial(state, building.id, 'planks', 1)).toBe(0);
    expect(deliverConstructionMaterial(state, building.id, 'stone', 1)).toBe(0);
    expect(deliverConstructionMaterial(state, building.id, 'planks', -2)).toBe(0);
    expect(building.constructionMaterialsDelivered.planks).toBe(1);
  });

  it('advances all buildings independently', () => {
    const state = createGameState();
    const a = createBuilding('a', 'player', 'stonecutter_hut', '30-30');
    const b = createBuilding('b', 'player', 'stonecutter_hut', '40-40');
    state.buildings.push(a, b);
    state.player.resources.planks = 2;
    deliverConstructionMaterial(state, a.id, 'planks', 1);
    deliverConstructionMaterial(state, b.id, 'planks', 1);
    advanceAllConstructions(state, 5);
    expect(a.constructionTimer).toBe(5);
    expect(b.constructionTimer).toBe(5);
    advanceAllConstructions(state, 5);
    expect(a.constructionComplete).toBe(true);
    expect(b.constructionComplete).toBe(true);
  });

  it('does not allow completion before all material work is processed', () => {
    const state = createGameState();
    const building = createBuilding('warehouse-1', 'player', 'warehouse', '30-30');
    state.buildings.push(building);
    building.constructionMaterialsDelivered = { planks: 3, stone: 3 };
    expect(() => completeConstruction(state, building.id)).toThrow('materials are not fully processed');
    building.constructionMaterialsDelivered = { planks: 3, stone: 3 };
    building.constructionQueue = ['stone'];
    expect(() => completeConstruction(state, building.id)).toThrow('materials are not fully processed');
  });

  it('activates a fully processed construction through the public completion API', () => {
    const state = createGameState();
    const building = createBuilding('warehouse-1', 'player', 'warehouse', '30-30');
    state.buildings.push(building);
    building.constructionMaterialsDelivered = { planks: 3, stone: 3 };
    building.constructionQueue = [];
    building.currentConstructionMaterial = null;
    completeConstruction(state, building.id, 2000);
    expect(building.constructionComplete).toBe(true);
    expect(building.active).toBe(true);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.COMPLETED);
    expect(building.constructionTimer).toBe(0);
    expect(building.lastConstructionUpdateAt).toBe(2000);
  });

  it('keeps a completed building completed when advanced again', () => {
    const state = createGameState();
    const building = createBuilding('stonecutter-1', 'player', 'stonecutter_hut', '30-30');
    state.buildings.push(building);
    state.player.resources.planks = 1;
    deliverConstructionMaterial(state, building.id, 'planks', 1);
    advanceConstruction(building, 10);
    advanceConstruction(building, 100);
    expect(building.constructionState).toBe(CONSTRUCTION_STATES.COMPLETED);
    expect(building.constructionTimer).toBe(0);
  });
});
