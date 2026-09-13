import { BUILDING_TYPES } from './buildings.js';

export const MILITARY_BUILDING_TYPE_IDS = Object.freeze(
  Object.values(BUILDING_TYPES)
    .filter((type) => type.role === 'military')
    .map((type) => type.id),
);

export function isMilitaryBuildingType(typeId) {
  return MILITARY_BUILDING_TYPE_IDS.includes(typeId);
}

export function isMilitaryBuilding(building) {
  return Boolean(building) && isMilitaryBuildingType(building.typeId);
}

export function getMilitaryBuildings(state, ownerId = null) {
  return (state?.buildings ?? []).filter(
    (building) => isMilitaryBuilding(building) && (ownerId === null || building.ownerId === ownerId),
  );
}

export function getMilitaryBuildingSpec(typeId) {
  return Object.values(BUILDING_TYPES).find(
    (type) => type.id === typeId && type.role === 'military',
  ) ?? null;
}

export function createMilitaryState() {
  return {
    soldiers: [],
    orders: [],
  };
}

export function ensureMilitaryState(state) {
  if (!state) throw new Error('Game state is required');
  state.military ??= createMilitaryState();
  return state.military;
}
