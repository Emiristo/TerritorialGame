import { BUILDING_TYPES } from './buildings.js';

export const MILITARY_BUILDING_TYPE_IDS = Object.freeze(
  Object.values(BUILDING_TYPES)
    .filter((type) => type.role === 'military')
    .map((type) => type.id),
);

export const GARRISON_CAPACITY = Object.freeze({
  outpost: 2,
  barracks: 3,
  watchtower: 6,
  fortress: 9,
});

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

export function getMilitaryTerritorySources(state) {
  return getMilitaryBuildings(state)
    .filter((building) => building.active && building.ownerId !== null && building.tileId)
    .map((building) => {
      const spec = getMilitaryBuildingSpec(building.typeId);
      return {
        id: `military:${building.id}`,
        ownerId: building.ownerId,
        tileId: building.tileId,
        influence: spec?.influenceMultiplier ?? 1,
        radius: spec?.influenceRadius ?? 0,
        active: true,
        sourceType: 'military-building',
      };
    });
}

export function createMilitaryState() {
  return { soldiers: [], orders: [] };
}

export function ensureMilitaryState(state) {
  if (!state) throw new Error('Game state is required');
  state.military ??= createMilitaryState();
  return state.military;
}

export function createSoldier(state, id, ownerId, rank = 1) {
  const military = ensureMilitaryState(state);
  if (!id) throw new Error('Soldier id is required');
  if (!ownerId) throw new Error('Soldier owner is required');
  if (military.soldiers.some((soldier) => soldier.id === id)) throw new Error(`Soldier already exists: ${id}`);
  const soldier = { id, ownerId, rank, status: 'available', garrisonBuildingId: null };
  military.soldiers.push(soldier);
  return soldier;
}

export function getSoldier(state, soldierId) {
  return ensureMilitaryState(state).soldiers.find((soldier) => soldier.id === soldierId) ?? null;
}

export function getGarrisonCapacity(building) {
  return GARRISON_CAPACITY[building?.typeId] ?? 0;
}

export function getGarrisonSoldiers(state, buildingId) {
  const building = (state?.buildings ?? []).find((item) => item.id === buildingId);
  if (!building || !isMilitaryBuilding(building)) return [];
  return (building.soldierIds ?? []).map((id) => getSoldier(state, id)).filter(Boolean);
}

export function assignSoldierToGarrison(state, soldierId, buildingId) {
  const soldier = getSoldier(state, soldierId);
  if (!soldier) throw new Error(`Unknown soldier: ${soldierId}`);
  const building = (state?.buildings ?? []).find((item) => item.id === buildingId);
  if (!building || !isMilitaryBuilding(building)) throw new Error(`Unknown military building: ${buildingId}`);
  if (!building.active) throw new Error('Military building is inactive');
  if (soldier.ownerId !== building.ownerId) throw new Error('Soldier and building owners do not match');
  if (soldier.garrisonBuildingId !== null) throw new Error('Soldier is already assigned to a garrison');
  building.soldierIds ??= [];
  if (building.soldierIds.length >= getGarrisonCapacity(building)) throw new Error('Military building garrison is full');
  building.soldierIds.push(soldier.id);
  soldier.garrisonBuildingId = building.id;
  soldier.status = 'garrisoned';
  return soldier;
}

export function removeSoldierFromGarrison(state, soldierId) {
  const soldier = getSoldier(state, soldierId);
  if (!soldier) throw new Error(`Unknown soldier: ${soldierId}`);
  if (soldier.garrisonBuildingId === null) return soldier;
  const building = (state?.buildings ?? []).find((item) => item.id === soldier.garrisonBuildingId);
  if (building) building.soldierIds = (building.soldierIds ?? []).filter((id) => id !== soldier.id);
  soldier.garrisonBuildingId = null;
  soldier.status = 'available';
  return soldier;
}
