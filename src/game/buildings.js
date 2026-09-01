export const BUILDING_TYPES = {
  HEADQUARTERS: { id: 'headquarters', name: 'Штаб', width: 3, height: 3, cost: {}, workerTypeId: null, toolId: null, workRadius: null, input: {}, output: null, productionTime: null, role: 'storage' },
  WAREHOUSE: { id: 'warehouse', name: 'Склад', width: 3, height: 3, cost: { planks: 3, stone: 3 }, workerTypeId: null, toolId: null, workRadius: null, input: {}, output: null, productionTime: null, role: 'storage' },
  FORESTER_HUT: { id: 'forester_hut', name: 'Хижина лесника', width: 2, height: 2, cost: { planks: 2 }, workerTypeId: 'forester', toolId: 'shovel', workRadius: 8, input: {}, output: { resourceId: 'forest', amount: 1 }, productionTime: 10, role: 'production' },
  STONECUTTER_HUT: { id: 'stonecutter_hut', name: 'Хижина каменщика', width: 2, height: 2, cost: { planks: 2 }, workerTypeId: 'stonemason', toolId: 'pickaxe', workRadius: 5, input: { stone_deposit: 1 }, output: { resourceId: 'stone', amount: 1 }, productionTime: 10, role: 'production' },
  SAWMILL: { id: 'sawmill', name: 'Лесопилка', width: 2, height: 3, cost: { planks: 2, stone: 2 }, workerTypeId: 'lumberjack_carpenter', toolId: 'axe_saw', workRadius: 5, input: { forest: 1 }, output: { resourceId: 'planks', amount: 1 }, productionTime: 15, role: 'production' },
  WELL: { id: 'well', name: 'Колодец', width: 2, height: 2, cost: { planks: 2 }, workerTypeId: 'resident', toolId: null, workRadius: null, input: {}, output: { resourceId: 'water', amount: 1 }, productionTime: 15, role: 'production' },
  FARM: { id: 'farm', name: 'Ферма', width: 4, height: 4, cost: { planks: 4, stone: 3 }, workerTypeId: 'farmer', toolId: 'scythe', workRadius: 0, workArea: { width: 4, height: 4, usableCells: 14 }, input: {}, output: { resourceId: 'wheat', amount: 1 }, productionTime: 30, role: 'production' },
  MILL: { id: 'mill', name: 'Мельница', width: 2, height: 2, cost: { planks: 2, stone: 2 }, workerTypeId: 'miller', toolId: 'bag', workRadius: null, input: { wheat: 1 }, output: { resourceId: 'flour', amount: 1 }, productionTime: 15, role: 'production' },
  BAKERY: { id: 'bakery', name: 'Пекарня', width: 2, height: 2, cost: { planks: 2, stone: 2 }, workerTypeId: 'baker', toolId: 'rolling_pin', workRadius: null, input: { flour: 1, water: 1 }, output: { resourceId: 'bread', amount: 1 }, productionTime: 15, role: 'production' },
  COAL_MINE: { id: 'coal_mine', name: 'Угольная шахта', width: 2, height: 2, cost: { planks: 4 }, workerTypeId: 'miner', toolId: 'pickaxe', workRadius: 5, input: { food: 1 }, output: { resourceId: 'coal', amount: 1 }, productionTime: 15, role: 'extraction' },
  IRON_MINE: { id: 'iron_mine', name: 'Железная шахта', width: 2, height: 2, cost: { planks: 4 }, workerTypeId: 'miner', toolId: 'pickaxe', workRadius: 5, input: { food: 1 }, output: { resourceId: 'iron', amount: 1 }, productionTime: 15, role: 'extraction' },
  GOLD_MINE: { id: 'gold_mine', name: 'Золотая шахта', width: 2, height: 2, cost: { planks: 4 }, workerTypeId: 'miner', toolId: 'pickaxe', workRadius: 5, input: { food: 1 }, output: { resourceId: 'gold', amount: 1 }, productionTime: 15, role: 'extraction' },
  MARBLE_MINE: { id: 'marble_mine', name: 'Мраморная шахта', width: 2, height: 2, cost: { planks: 4 }, workerTypeId: 'miner', toolId: 'pickaxe', workRadius: 5, input: { food: 1 }, output: { resourceId: 'stone', amount: 1 }, productionTime: 15, role: 'extraction' },
  FOUNDRY: { id: 'foundry', name: 'Плавильня', width: 2, height: 2, cost: { planks: 2, stone: 2 }, workerTypeId: 'steelworker', toolId: 'ladle', workRadius: null, input: { iron: 1, coal: 1 }, output: { resourceId: 'steel', amount: 1 }, productionTime: 15, role: 'production' },
  FORGE: { id: 'forge', name: 'Кузница', width: 2, height: 2, cost: { planks: 2, stone: 2 }, workerTypeId: 'blacksmith', toolId: 'hammer', workRadius: null, input: { steel: 1, coal: 1 }, output: { resourceId: 'sword', amount: 1 }, productionTime: 15, role: 'production' },
  WORKSHOP: { id: 'workshop', name: 'Цех', width: 3, height: 3, cost: { planks: 2, stone: 2 }, workerTypeId: 'master', toolId: 'tongs', workRadius: null, input: { steel: 1, planks: 1 }, output: { resourceId: 'tool', amount: 1 }, productionTime: 15, role: 'production' },
  MINT: { id: 'mint', name: 'Монетный двор', width: 2, height: 2, cost: { planks: 2, stone: 2 }, workerTypeId: 'steelworker', toolId: 'ladle', workRadius: null, input: { gold: 1, coal: 1 }, output: { resourceId: 'coin', amount: 1 }, productionTime: 15, role: 'production' },
  OUTPOST: { id: 'outpost', name: 'Форпост', width: 2, height: 2, cost: { planks: 3 }, workerTypeId: 'soldier', toolId: null, workRadius: null, influenceMultiplier: 0.75, requiredSoldiers: 1, role: 'military' },
  BARRACKS: { id: 'barracks', name: 'Казарма', width: 3, height: 3, cost: { planks: 3, stone: 1 }, workerTypeId: 'soldier', toolId: null, workRadius: null, influenceMultiplier: 1, requiredSoldiers: 3, role: 'military' },
  WATCHTOWER: { id: 'watchtower', name: 'Сторожевая башня', width: 2, height: 2, cost: { planks: 5, stone: 5 }, workerTypeId: 'soldier', toolId: null, workRadius: null, influenceMultiplier: 1.25, requiredSoldiers: 6, role: 'military' },
  FORTRESS: { id: 'fortress', name: 'Крепость', width: 5, height: 5, cost: { planks: 10, stone: 10 }, workerTypeId: 'soldier', toolId: null, workRadius: null, influenceMultiplier: 1.5, requiredSoldiers: 9, blockChanceBonus: 0.05, role: 'military' },
};

export function createBuilding(id, ownerId, typeId, tileId) {
  const type = Object.values(BUILDING_TYPES).find((item) => item.id === typeId);
  if (!type) throw new Error(`Unknown building type: ${typeId}`);
  return { id, ownerId, typeId, tileId, active: true, workerIds: [], soldierIds: [] };
}

export function getBuildingType(building) {
  return Object.values(BUILDING_TYPES).find((item) => item.id === building.typeId) ?? null;
}

export function canBuildOnTile(state, typeId, tileId, ownerId = state.player.id) {
  const type = Object.values(BUILDING_TYPES).find((item) => item.id === typeId);
  const tile = state.tiles.find((item) => item.id === tileId);
  if (!type || !tile) return false;
  return tile.ownerId === ownerId && tile.terrain === type.terrainId;
}

export function addBuilding(state, building) {
  if (!canBuildOnTile(state, building.typeId, building.tileId, building.ownerId)) throw new Error('Building cannot be placed on this tile');
  state.buildings ??= [];
  if (state.buildings.some((item) => item.tileId === building.tileId && item.active)) throw new Error('Tile already has an active building');
  state.buildings.push(building);
  return building;
}

export function getBuildingAtTile(state, tileId) {
  return (state.buildings ?? []).find((building) => building.tileId === tileId && building.active) ?? null;
}
