export const BUILDING_TYPES = {
  HEADQUARTERS: { id: 'headquarters', name: 'Штаб', width: 3, height: 3, cost: {}, terrainIds: null, workerTypeId: null, toolId: null, workRadius: null, influenceRadius: 10, input: {}, output: null, productionTime: null, role: 'storage' },
  WAREHOUSE: { id: 'warehouse', name: 'Склад', width: 3, height: 3, cost: { planks: 3, stone: 3 }, terrainIds: ['plains'], workerTypeId: null, toolId: null, workRadius: null, input: {}, output: null, productionTime: null, role: 'storage' },
  FORESTER_HUT: { id: 'forester_hut', name: 'Хижина лесника', width: 2, height: 2, cost: { planks: 2 }, terrainIds: ['plains'], workerTypeId: 'forester', toolId: 'shovel', workRadius: 8, input: {}, output: { resourceId: 'wood', amount: 1 }, productionTime: 10, role: 'production' },
  STONECUTTER_HUT: { id: 'stonecutter_hut', name: 'Хижина каменщика', width: 2, height: 2, cost: { planks: 2 }, terrainIds: ['plains'], workerTypeId: 'stonemason', toolId: 'pickaxe', workRadius: 5, input: {}, output: { resourceId: 'stone', amount: 1 }, productionTime: 10, role: 'extraction' },
  SAWMILL: { id: 'sawmill', name: 'Лесопилка', width: 2, height: 3, cost: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'lumberjack', toolId: 'axe', workRadius: 5, input: { wood: 1 }, output: { resourceId: 'planks', amount: 1 }, productionTime: 15, role: 'production' },
  WELL: { id: 'well', name: 'Колодец', width: 2, height: 2, cost: { planks: 2 }, terrainIds: ['plains'], workerTypeId: 'resident', toolId: null, workRadius: null, input: {}, output: { resourceId: 'water', amount: 1 }, productionTime: 15, role: 'production' },
  FARM: { id: 'farm', name: 'Ферма', width: 4, height: 4, cost: { planks: 4, stone: 3 }, terrainIds: ['plains'], workerTypeId: 'farmer', toolId: 'scythe', workRadius: null, workArea: { width: 4, height: 4, usableCells: 14 }, input: {}, output: { resourceId: 'wheat', amount: 1 }, productionTime: 30, role: 'production' },
  MILL: { id: 'mill', name: 'Мельница', width: 2, height: 2, cost: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'miller', toolId: 'bag', workRadius: null, input: { wheat: 1 }, output: { resourceId: 'flour', amount: 1 }, productionTime: 15, role: 'production' },
  BAKERY: { id: 'bakery', name: 'Пекарня', width: 2, height: 2, cost: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'baker', toolId: 'rolling_pin', workRadius: null, input: { flour: 1, water: 1 }, output: { resourceId: 'bread', amount: 1 }, productionTime: 15, role: 'production' },
  COAL_MINE: { id: 'coal_mine', name: 'Угольная шахта', width: 2, height: 2, cost: { planks: 4 }, terrainIds: ['hills', 'mountains'], workerTypeId: 'miner', toolId: 'pickaxe', workRadius: 5, input: { food: 1 }, output: { resourceId: 'coal', amount: 1 }, productionTime: 15, role: 'extraction' },
  IRON_MINE: { id: 'iron_mine', name: 'Железная шахта', width: 2, height: 2, cost: { planks: 4 }, terrainIds: ['hills', 'mountains'], workerTypeId: 'miner', toolId: 'pickaxe', workRadius: 5, input: { food: 1 }, output: { resourceId: 'iron', amount: 1 }, productionTime: 15, role: 'extraction' },
  GOLD_MINE: { id: 'gold_mine', name: 'Золотая шахта', width: 2, height: 2, cost: { planks: 4 }, terrainIds: ['hills', 'mountains'], workerTypeId: 'miner', toolId: 'pickaxe', workRadius: 5, input: { food: 1 }, output: { resourceId: 'gold', amount: 1 }, productionTime: 15, role: 'extraction' },
  MARBLE_MINE: { id: 'marble_mine', name: 'Мраморная шахта', width: 2, height: 2, cost: { planks: 4 }, terrainIds: ['hills', 'mountains'], workerTypeId: 'miner', toolId: 'pickaxe', workRadius: 5, input: { food: 1 }, output: { resourceId: 'stone', amount: 1 }, productionTime: 15, role: 'extraction' },
  FOUNDRY: { id: 'foundry', name: 'Плавильня', width: 2, height: 2, cost: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'steelworker', toolId: 'ladle', workRadius: null, input: { iron: 1, coal: 1 }, output: { resourceId: 'steel', amount: 1 }, productionTime: 15, role: 'production' },
  FORGE: { id: 'forge', name: 'Кузница', width: 2, height: 2, cost: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'blacksmith', toolId: 'hammer', workRadius: null, input: { steel: 1, coal: 1 }, output: { resourceId: 'sword', amount: 1 }, productionTime: 15, role: 'production' },
  WORKSHOP: { id: 'workshop', name: 'Цех', width: 3, height: 3, cost: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'master', toolId: 'tongs', workRadius: null, input: { steel: 1, planks: 1 }, output: { resourceId: 'tool', amount: 1 }, productionTime: 15, role: 'production' },
  MINT: { id: 'mint', name: 'Монетный двор', width: 2, height: 2, cost: { planks: 2, stone: 2 }, terrainIds: ['plains'], workerTypeId: 'steelworker', toolId: 'ladle', workRadius: null, input: { gold: 1, coal: 1 }, output: { resourceId: 'coin', amount: 1 }, productionTime: 15, role: 'production' },
  OUTPOST: { id: 'outpost', name: 'Форпост', width: 2, height: 2, cost: { planks: 3 }, terrainIds: ['plains'], workerTypeId: 'soldier', toolId: null, workRadius: null, input: {}, output: null, productionTime: null, influenceMultiplier: 0.75, requiredSoldiers: 1, role: 'military' },
  BARRACKS: { id: 'barracks', name: 'Казарма', width: 3, height: 3, cost: { planks: 3, stone: 1 }, terrainIds: ['plains'], workerTypeId: 'soldier', toolId: null, workRadius: null, input: {}, output: null, productionTime: null, influenceMultiplier: 1, requiredSoldiers: 3, role: 'military' },
  WATCHTOWER: { id: 'watchtower', name: 'Сторожевая башня', width: 2, height: 2, cost: { planks: 5, stone: 5 }, terrainIds: ['plains'], workerTypeId: 'soldier', toolId: null, workRadius: null, input: {}, output: null, productionTime: null, influenceMultiplier: 1.25, requiredSoldiers: 6, role: 'military' },
  FORTRESS: { id: 'fortress', name: 'Крепость', width: 5, height: 5, cost: { planks: 10, stone: 10 }, terrainIds: ['plains'], workerTypeId: 'soldier', toolId: null, workRadius: null, input: {}, output: null, productionTime: null, influenceMultiplier: 1.5, requiredSoldiers: 9, blockChanceBonus: 0.05, role: 'military' },
};

function findType(typeId) { return Object.values(BUILDING_TYPES).find((item) => item.id === typeId) ?? null; }

export function createBuilding(id, ownerId, typeId, tileId) {
  if (!findType(typeId)) throw new Error(`Unknown building type: ${typeId}`);
  return { id, ownerId, typeId, tileId, active: true, workerIds: [], soldierIds: [] };
}

export function getBuildingType(building) { return findType(building.typeId); }

export function getFootprintTiles(state, typeId, originTileId) {
  const type = findType(typeId); const origin = state.tiles.find((tile) => tile.id === originTileId); if (!type || !origin) return [];
  const footprint = [];
  for (let dy = 0; dy < type.height; dy += 1) for (let dx = 0; dx < type.width; dx += 1) { const tile = state.tiles.find((candidate) => candidate.x === origin.x + dx && candidate.y === origin.y + dy); if (!tile) return []; footprint.push(tile); }
  return footprint;
}

export function getReservedTiles(state, typeId, originTileId) {
  const footprint = getFootprintTiles(state, typeId, originTileId); if (!footprint.length) return [];
  const coords = new Set(footprint.map((tile) => `${tile.x},${tile.y}`)); const reserved = [];
  for (const tile of state.tiles) {
    if (coords.has(`${tile.x},${tile.y}`)) continue;
    const adjacent = footprint.some((cell) => Math.max(Math.abs(tile.x - cell.x), Math.abs(tile.y - cell.y)) === 1);
    if (adjacent) reserved.push(tile);
  }
  return reserved;
}

export function getBuildingAtTile(state, tileId) {
  return (state.buildings ?? []).find((building) => building.active && getFootprintTiles(state, building.typeId, building.tileId).some((tile) => tile.id === tileId)) ?? null;
}

export function isReservedForBuilding(state, tileId) {
  return (state.buildings ?? []).some((building) => building.active && getReservedTiles(state, building.typeId, building.tileId).some((tile) => tile.id === tileId));
}

export function canBuildOnTile(state, typeId, tileId, ownerId = state.player.id) {
  const type = findType(typeId); const footprint = getFootprintTiles(state, typeId, tileId); if (!type || footprint.length !== type.width * type.height) return false;
  if (footprint.some((tile) => tile.ownerId !== ownerId)) return false;
  if (type.terrainIds && footprint.some((tile) => !type.terrainIds.includes(tile.terrain))) return false;
  if (footprint.some((tile) => getBuildingAtTile(state, tile.id) || isReservedForBuilding(state, tile.id))) return false;
  return true;
}

export function addBuilding(state, building) {
  if (!canBuildOnTile(state, building.typeId, building.tileId, building.ownerId)) throw new Error('Building cannot be placed on this footprint');
  state.buildings ??= []; state.buildings.push(building); return building;
}
