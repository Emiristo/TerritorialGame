import { createFlag } from './flags.js';
import { getBuildingFlagPosition } from './buildings.js';
import { removeRoadsForFlag } from './roads.js';
import { rebuildLogisticsNetwork } from './logisticsNetwork.js';

export function ensureBuildingFlag(state, building) {
  state.flags ??= [];
  const position = building.flagPosition ?? getBuildingFlagPosition(state, building);
  if (!position) throw new Error(`Cannot place logistics flag for building: ${building.id}`);

  building.flagId ??= `${building.id}-flag`;
  building.flagPosition = { x: position.x, y: position.y };

  const existing = state.flags.find((flag) => flag.id === building.flagId);
  if (existing) return existing;

  return createFlag(building.flagId, building.id, building.ownerId, position.x, position.y);
}

export function syncBuildingFlags(state) {
  state.flags ??= [];
  const buildingIds = new Set((state.buildings ?? []).map((building) => building.id));

  // Building-bound flags are lifecycle-managed by their building.
  // Standalone flags (buildingId === null/undefined) are independent nodes
  // and must survive synchronization.
  state.flags = state.flags.filter(
    (flag) => flag.buildingId == null || buildingIds.has(flag.buildingId),
  );

  for (const building of state.buildings ?? []) {
    const flag = ensureBuildingFlag(state, building);
    if (!state.flags.includes(flag)) state.flags.push(flag);
  }
  rebuildLogisticsNetwork(state);
  return state.flags;
}

export function destroyBuilding(state, buildingId) {
  const index = (state.buildings ?? []).findIndex((building) => building.id === buildingId);
  if (index < 0) return null;

  const [building] = state.buildings.splice(index, 1);
  const flag = (state.flags ?? []).find((item) => item.buildingId === buildingId);
  if (flag) removeRoadsForFlag(state, flag.id);
  state.flags = (state.flags ?? []).filter((item) => item.buildingId !== buildingId);
  rebuildLogisticsNetwork(state);
  return building;
}
