export const RESOURCE_TYPES = {
  WOOD: { id: 'wood', name: 'Дерево', terrain: 'forest', maxStock: 9 },
  PLANKS: { id: 'planks', name: 'Доски', terrain: null, maxStock: null },
  STONE: { id: 'stone', name: 'Камень', terrain: 'plains', maxStock: 25 },
  ORE: { id: 'ore', name: 'Руда', terrain: 'mountains', maxStock: 25 },
  FOOD: { id: 'food', name: 'Пища', terrain: 'plains', maxStock: 9 },
};

export function createTileResources() {
  return { wood: 0, stone: 0, ore: 0, food: 0 };
}

export function createPlayerResources() {
  return { wood: 0, planks: 0, stone: 0, ore: 0, food: 0 };
}

export function createResourceDeposit(resourceId, amount = 25) {
  return { resourceId, amount, maxAmount: amount };
}

export function hasResourceDeposit(tile, resourceId) {
  return (tile.resources?.[resourceId] ?? 0) > 0;
}
