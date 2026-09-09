import {
  getBuildingInputStorage,
  removeInputResourceFromBuilding,
  addProductionOutputToBuilding,
} from './carriers.js';

export const PRODUCTION_STATES = Object.freeze({ IDLE: 'idle', PROCESSING: 'processing', OUTPUT_FULL: 'output_full' });

function getBuildingType(state, building) {
  return (state.buildingTypes ?? []).find((type) => type.id === building?.typeId) ?? null;
}

function getInputCount(slots, resourceId) {
  return slots.filter((resource) => resource === resourceId).length;
}

function hasRequiredInputs(slots, input) {
  return Object.entries(input ?? {}).every(([resourceId, amount]) =>
    getInputCount(slots, resourceId) >= Number(amount ?? 0));
}

export function canStartProduction(state, building) {
  if (!building?.active || !building.constructionComplete) return false;
  const type = getBuildingType(state, building);
  if (type?.role !== 'production' || !type.output?.resourceId || !Number(type.productionTime)) return false;
  if (building.outputStorageSlot != null) return false;
  if (building.productionState === PRODUCTION_STATES.PROCESSING) return false;
  return hasRequiredInputs(getBuildingInputStorage(state, building.id), type.input);
}

export function startProduction(state, building) {
  if (!canStartProduction(state, building)) return false;
  const type = getBuildingType(state, building);
  for (const [resourceId, amount] of Object.entries(type.input ?? {})) {
    if (removeInputResourceFromBuilding(state, building.id, resourceId, Number(amount ?? 0)) !== Number(amount ?? 0)) return false;
  }
  building.productionState = PRODUCTION_STATES.PROCESSING;
  building.productionTimer = Number(type.productionTime);
  building.productionStartedAt = Date.now();
  return true;
}

export function advanceProduction(state, building, elapsedSeconds = 1) {
  if (!building?.active || !building.constructionComplete) return false;
  const type = getBuildingType(state, building);
  if (type?.role !== 'production') return false;

  if (building.productionState !== PRODUCTION_STATES.PROCESSING) {
    if (building.outputStorageSlot != null) {
      building.productionState = PRODUCTION_STATES.OUTPUT_FULL;
      return false;
    }
    startProduction(state, building);
  }

  if (building.productionState !== PRODUCTION_STATES.PROCESSING) return false;
  building.productionTimer = Math.max(0, Number(building.productionTimer ?? 0) - Math.max(0, Number(elapsedSeconds) || 0));
  if (building.productionTimer > 0) return false;

  if (addProductionOutputToBuilding(state, building.id, type.output.resourceId, 1) !== 1) {
    building.productionState = PRODUCTION_STATES.OUTPUT_FULL;
    return false;
  }
  building.productionTimer = 0;
  building.productionState = PRODUCTION_STATES.IDLE;
  return true;
}

export function advanceAllProductions(state, elapsedSeconds = 1) {
  for (const building of state.buildings ?? []) advanceProduction(state, building, elapsedSeconds);
  return state;
}
