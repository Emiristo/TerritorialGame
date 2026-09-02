export const BUILDING_TYPES = {
  HEADQUARTERS: { id: 'headquarters', name: 'Штаб', width: 3, height: 3, constructionMaterials: {}, terrainIds: null, workerTypeId: null, toolId: null, workZone: null, influenceRadius: 10, input: {}, output: null, productionTime: null, role: 'storage' },
  WAREHOUSE: { id: 'warehouse', name: 'Склад', width: 3, height: 3, constructionMaterials: { planks: 3, stone: 3 }, terrainIds: ['plains'], workerTypeId: null, toolId: null, workZone: null, input: {}, output: null, productionTime: null, role: 'storage' },
  FORESTER_HUT: { id: 'forester_hut', name: 'Хижина лесника', width: 2, height: 2, constructionMaterials: { planks: 2 }, terrainIds: ['plains'], workerTypeId: 'forester', toolId: 'shovel', workZone: { mode: 'radius', radius: 5 }, input: {}, output: { resourceId: 'wood', amount: 1 }, productionTime: 10, role: 'production' },
  LUMBERJACK_HUT: { id: 'lumberjack_hut', name: 'Хижина лесоруба', width: 2, height: 2, constructionMaterials: { planks: 2 }, terrainIds: ['plains'], workerTypeId: 'lumberjack', toolId: 'axe', workZone: { mode: 'radius', radius: 5 }, input: {}, output: { resourceId: 'wood', amount: 1 }, productionTime: 10, role: 'extraction' },
  STONECUTTER_HUT: { id: 'stonecutter_hut', name: 'Хижина каменщика', width: 2, height: 2, constructionMaterials: { planks: 2 }, terrainIds: ['plains'], workerTypeId: 'stonemason', toolId: 'pickaxe', workZone: { mode: 'radius', radius: 5 }, input: {}, output: { resourceId: 'stone', amount: 1 }, productionTime: 10, role: 'extraction' },
  SAWMILL: { id: 'sawmill', name: 'Лесопилка', width: 2, height: 3, constructionMaterials: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'carpenter', toolId: 'saw', workZone: { mode: 'footprint' }, input: { wood: 1 }, output: { resourceId: 'planks', amount: 1 }, productionTime: 15, role: 'production' },
  WELL: { id: 'well', name: 'Колодец', width: 2, height: 2, constructionMaterials: { planks: 2 }, terrainIds: ['plains'], workerTypeId: 'resident', toolId: null, workZone: { mode: 'footprint' }, input: {}, output: { resourceId: 'water', amount: 1 }, productionTime: 15, role: 'production' },
  FARM: { id: 'farm', name: 'Ферма', width: 4, height: 4, constructionMaterials: { planks: 4, stone: 3 }, terrainIds: ['plains'], workerTypeId: 'farmer', toolId: 'scythe', workZone: { mode: 'footprint' }, workArea: { width: 4, height: 4, usableCells: 14 }, input: {}, output: { resourceId: 'wheat', amount: 1 }, productionTime: 30, role: 'production' },
  MILL: { id: 'mill', name: 'Мельница', width: 2, height: 2, constructionMaterials: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'miller', toolId: 'bag', workZone: { mode: 'footprint' }, input: { wheat: 1 }, output: { resourceId: 'flour', amount: 1 }, productionTime: 15, role: 'production' },
  BAKERY: { id: 'bakery', name: 'Пекарня', width: 2, height: 2, constructionMaterials: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'baker', toolId: 'rolling_pin', workZone: { mode: 'footprint' }, input: { flour: 1, water: 1 }, output: { resourceId: 'bread', amount: 1 }, productionTime: 15, role: 'production' },
  COAL_MINE: { id: 'coal_mine', name: 'Угольная шахта', width: 2, height: 2, constructionMaterials: { planks: 4 }, terrainIds: ['hills', 'mountains'], workerTypeId: 'miner', toolId: 'pickaxe', workZone: { mode: 'radius', radius: 5 }, input: { food: 1 }, output: { resourceId: 'coal', amount: 1 }, productionTime: 15, role: 'extraction' },
  IRON_MINE: { id: 'iron_mine', name: 'Железная шахта', width: 2, height: 2, constructionMaterials: { planks: 4 }, terrainIds: ['hills', 'mountains'], workerTypeId: 'miner', toolId: 'pickaxe', workZone: { mode: 'radius', radius: 5 }, input: { food: 1 }, output: { resourceId: 'iron', amount: 1 }, productionTime: 15, role: 'extraction' },
  GOLD_MINE: { id: 'gold_mine', name: 'Золотая шахта', width: 2, height: 2, constructionMaterials: { planks: 4 }, terrainIds: ['hills', 'mountains'], workerTypeId: 'miner', toolId: 'pickaxe', workZone: { mode: 'radius', radius: 5 }, input: { food: 1 }, output: { resourceId: 'gold', amount: 1 }, productionTime: 15, role: 'extraction' },
  MARBLE_MINE: { id: 'marble_mine', name: 'Мраморная шахта', width: 2, height: 2, constructionMaterials: { planks: 4 }, terrainIds: ['hills', 'mountains'], workerTypeId: 'miner', toolId: 'pickaxe', workZone: { mode: 'radius', radius: 5 }, input: { food: 1 }, output: { resourceId: 'stone', amount: 1 }, productionTime: 15, role: 'extraction' },
  FOUNDRY: { id: 'foundry', name: 'Плавильня', width: 2, height: 2, constructionMaterials: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'steelworker', toolId: 'ladle', workZone: { mode: 'footprint' }, input: { iron: 1, coal: 1 }, output: { resourceId: 'steel', amount: 1 }, productionTime: 15, role: 'production' },
  FORGE: { id: 'forge', name: 'Кузница', width: 2, height: 2, constructionMaterials: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'blacksmith', toolId: 'hammer', workZone: { mode: 'footprint' }, input: { steel: 1, coal: 1 }, output: { resourceId: 'sword', amount: 1 }, productionTime: 15, role: 'production' },
  WORKSHOP: { id: 'workshop', name: 'Цех', width: 3, height: 3, constructionMaterials: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'master', toolId: 'tongs', workZone: { mode: 'footprint' }, input: { steel: 1, planks: 1 }, output: { resourceId: 'tool', amount: 1 }, productionTime: 15, role: 'production' },
  MINT: { id: 'mint', name: 'Монетный двор', width: 2, height: 2, constructionMaterials: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'steelworker', toolId: 'ladle', workZone: { mode: 'footprint' }, input: { gold: 1, coal: 1 }, output: { resourceId: 'coin', amount: 1 }, productionTime: 15, role: 'production' },
  OUTPOST: { id: 'outpost', name: 'Форпост', width: 2, height: 2, constructionMaterials: { planks: 3 }, terrainIds: ['plains'], workerTypeId: 'soldier', toolId: null, workZone: { mode: 'footprint' }, input: {}, output: null, productionTime: null, influenceMultiplier: 0.75, requiredSoldiers: 1, role: 'military' },
  BARRACKS: { id: 'barracks', name: 'Казарма', width: 3, height: 3, constructionMaterials: { planks: 3, stone: 1 }, terrainIds: ['plains'], workerTypeId: 'soldier', toolId: null, workZone: { mode: 'footprint' }, input: {}, output: null, productionTime: null, influenceMultiplier: 1, requiredSoldiers: 3, role: 'military' },
  WATCHTOWER: { id: 'watchtower', name: 'Сторожевая башня', width: 2, height: 2, constructionMaterials: { planks: 5, stone: 5 }, terrainIds: ['plains'], workerTypeId: 'soldier', toolId: null, workZone: { mode: 'footprint' }, input: {}, output: null, productionTime: null, influenceMultiplier: 1.25, requiredSoldiers: 6, role: 'military' },
  FORTRESS: { id: 'fortress', name: 'Крепость', width: 5, height: 5, constructionMaterials: { planks: 10, stone: 10 }, terrainIds: ['plains'], workerTypeId: 'soldier', toolId: null, workZone: { mode: 'footprint' }, input: {}, output: null, productionTime: null, influenceMultiplier: 1.5, requiredSoldiers: 9, blockChanceBonus: 0.05, role: 'military' },
};

const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;

function findType(typeId) {
  return Object.values(BUILDING_TYPES).find((item) => item.id === typeId) ?? null;
}

function getTileAt(state, x, y) {
  if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) return null;
  return state.tiles[y * MAP_WIDTH + x] ?? null;
}

function getTileById(state, tileId) {
  if (typeof tileId !== 'string') return null;
  const separator = tileId.indexOf('-');
  if (separator <= 0) return null;
  const x = Number(tileId.slice(0, separator));
  const y = Number(tileId.slice(separator + 1));
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  return getTileAt(state, x, y);
}

export function getConstructionMaterials(building) {
  return { ...(findType(building.typeId)?.constructionMaterials ?? {}) };
}

export function createBuilding(id, ownerId, typeId, tileId) {
  const type = findType(typeId);
  if (!type) throw new Error(`Unknown building type: ${typeId}`);
  const required = getConstructionMaterials({ typeId });
  const complete = Object.keys(required).length === 0;
  return {
    id,
    ownerId,
    typeId,
    tileId,
    active: complete,
    constructionComplete: complete,
    constructionMaterialsRequired: required,
    constructionMaterialsDelivered: Object.fromEntries(Object.keys(required).map((resource) => [resource, 0])),
    constructionQueue: [],
    currentConstructionMaterial: null,
    currentConstructionMaterialRemainingTime: 0,
    workerIds: [],
    soldierIds: [],
    constructionTimer: 0,
  };
}

export function getBuildingType(building) {
  return findType(building.typeId);
}

export function getFootprintTiles(state, typeId, originTileId) {
  const type = findType(typeId);
  const origin = getTileById(state, originTileId);
  if (!type || !origin) return [];

  const footprint = [];
  for (let dy = 0; dy < type.height; dy += 1) {
    for (let dx = 0; dx < type.width; dx += 1) {
      const tile = getTileAt(state, origin.x + dx, origin.y + dy);
      if (!tile) return [];
      footprint.push(tile);
    }
  }
  return footprint;
}

export function getReservedTiles(state, typeId, originTileId) {
  const footprint = getFootprintTiles(state, typeId, originTileId);
  if (!footprint.length) return [];

  const footprintIds = new Set(footprint.map((tile) => tile.id));
  return state.tiles.filter((tile) => (
    !footprintIds.has(tile.id)
    && footprint.some((cell) => Math.max(Math.abs(tile.x - cell.x), Math.abs(tile.y - cell.y)) === 1)
  ));
}

export function getBuildingAtTile(state, tileId) {
  return (state.buildings ?? []).find((building) => (
    getFootprintTiles(state, building.typeId, building.tileId).some((tile) => tile.id === tileId)
  )) ?? null;
}

export function isReservedForBuilding(state, tileId) {
  return (state.buildings ?? []).some((building) => (
    getReservedTiles(state, building.typeId, building.tileId).some((tile) => tile.id === tileId)
  ));
}

export function canBuildOnTile(state, typeId, tileId, ownerId = state.player.id) {
  const type = findType(typeId);
  const footprint = getFootprintTiles(state, typeId, tileId);
  if (!type || footprint.length !== type.width * type.height) return false;
  if (footprint.some((tile) => tile.ownerId !== ownerId)) return false;
  if (type.terrainIds && footprint.some((tile) => !type.terrainIds.includes(tile.terrain))) return false;
  if (footprint.some((tile) => getBuildingAtTile(state, tile.id) || isReservedForBuilding(state, tile.id))) return false;
  return true;
}

export function addBuilding(state, building) {
  if (!canBuildOnTile(state, building.typeId, building.tileId, building.ownerId)) {
    throw new Error('Building cannot be placed on this footprint');
  }
  state.buildings ??= [];
  state.buildings.push(building);
  return building;
}
