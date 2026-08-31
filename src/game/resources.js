export const RESOURCE_TYPES = {
  WOOD: { id: 'wood', name: 'Дерево', terrain: 'forest', maxStock: 9 },
  STONE: { id: 'stone', name: 'Камень', terrain: 'mountains', maxStock: 9 },
  ORE: { id: 'ore', name: 'Руда', terrain: 'mountains', maxStock: 9 },
  FOOD: { id: 'food', name: 'Пища', terrain: 'plains', maxStock: 9 },
};

export function createTileResources() {
  return {
    wood: 0,
    stone: 0,
    ore: 0,
    food: 0,
  };
}

export function createResourceDeposit(resourceId, amount = 9) {
  return {
    resourceId,
    amount,
    maxAmount: amount,
  };
}

export function hasResourceDeposit(tile, resourceId) {
  return tile.resources?.[resourceId] > 0;
}
