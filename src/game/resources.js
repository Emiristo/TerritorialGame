export const RESOURCE_TYPES = {
  WOOD: { id: 'wood', name: 'Дерево', terrain: 'forest', maxStock: 9 },
  PLANKS: { id: 'planks', name: 'Доски', terrain: null, maxStock: null },
  STONE: { id: 'stone', name: 'Камень', terrain: 'plains', maxStock: 25 },
  ORE: { id: 'ore', name: 'Руда', terrain: 'mountains', maxStock: 25 },
  FISH: { id: 'fish', name: 'Рыба', terrain: null, maxStock: null },
  MEAT: { id: 'meat', name: 'Мясо', terrain: null, maxStock: null },
  FRUIT: { id: 'fruit', name: 'Фрукты', terrain: null, maxStock: null },
  WATER: { id: 'water', name: 'Вода', terrain: null, maxStock: null },
  WHEAT: { id: 'wheat', name: 'Пшеница', terrain: null, maxStock: null },
  FLOUR: { id: 'flour', name: 'Мука', terrain: null, maxStock: null },
  BREAD: { id: 'bread', name: 'Хлеб', terrain: null, maxStock: null },
  COAL: { id: 'coal', name: 'Уголь', terrain: null, maxStock: null },
  IRON: { id: 'iron', name: 'Железо', terrain: null, maxStock: null },
  GOLD: { id: 'gold', name: 'Золото', terrain: null, maxStock: null },
  STEEL: { id: 'steel', name: 'Сталь', terrain: null, maxStock: null },
  SWORD: { id: 'sword', name: 'Меч', terrain: null, maxStock: null },
  TOOL: { id: 'tool', name: 'Инструмент', terrain: null, maxStock: null },
  COIN: { id: 'coin', name: 'Монета', terrain: null, maxStock: null },
};

export function createTileResources() {
  return { wood: 0, stone: 0, ore: 0, fish: 0, meat: 0, fruit: 0 };
}

export function createPlayerResources() {
  return Object.fromEntries(Object.values(RESOURCE_TYPES).map(({ id }) => [id, 0]));
}

export function createResourceDeposit(resourceId, amount = 25) {
  return { resourceId, amount, maxAmount: amount };
}

export function hasResourceDeposit(tile, resourceId) {
  return (tile.resources?.[resourceId] ?? 0) > 0;
}
