export const TERRAIN_TYPES = {
  PLAINS: {
    id: 'plains',
    name: 'Равнина',
    movementCost: 1,
    resources: ['food'],
  },
  FOREST: {
    id: 'forest',
    name: 'Лес',
    movementCost: 2,
    resources: ['wood'],
  },
  MOUNTAINS: {
    id: 'mountains',
    name: 'Горы',
    movementCost: 3,
    resources: ['stone', 'ore'],
  },
  HILLS: {
    id: 'hills',
    name: 'Холмы',
    movementCost: 2,
    resources: ['stone', 'ore'],
  },
  WATER: {
    id: 'water',
    name: 'Вода',
    movementCost: Infinity,
    resources: [],
  },
};

export const TERRAIN_BY_ID = Object.fromEntries(
  Object.values(TERRAIN_TYPES).map((terrain) => [terrain.id, terrain]),
);

export function isPassableTerrain(terrainId) {
  return TERRAIN_BY_ID[terrainId]?.movementCost !== Infinity;
}
