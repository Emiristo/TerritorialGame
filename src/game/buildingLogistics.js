import { rebuildLogisticsNetwork } from './logisticsNetwork.js';
import { destroyBuilding as removeBuilding } from './buildings.js';

export function ensureBuildingFlag(state, building) {
  const flag = (state.flags ?? []).find((item) => item.id === building.flagId && item.buildingId === building.id);
  if (!flag) throw new Error(`Building flag not found: ${building.id}`);
  return flag;
}

export function syncBuildingFlags(state) {
  state.flags ??= [];
  const buildingIds = new Set((state.buildings ?? []).map((building) => building.id));
  state.flags = state.flags.filter(
    (flag) => flag.buildingId == null || buildingIds.has(flag.buildingId),
  );
  for (const building of state.buildings ?? []) ensureBuildingFlag(state, building);
  rebuildLogisticsNetwork(state);
  return state.flags;
}

// Kept as a compatibility export: building lifecycle is implemented by buildings.js.
export function destroyBuilding(state, buildingId) {
  return removeBuilding(state, buildingId);
}
