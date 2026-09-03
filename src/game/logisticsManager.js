import { findFlagRoute } from './logisticsNetwork.js';
import {
  createBuildingTransportRequest,
  getBuildingInventory,
  stageBuildingOutputAtFlag,
} from './carriers.js';

function getBuildingType(state, building) {
  return (state.buildingTypes ?? []).find((type) => type.id === building?.typeId) ?? null;
}

function getBuildingFlag(state, buildingId) {
  return (state.flags ?? []).find((flag) => flag.buildingId === buildingId) ?? null;
}

function hasOpenRequest(state, sourceFlagId, destinationFlagId, resourceId) {
  return (state.transportRequests ?? []).some((request) =>
    request.sourceFlagId === sourceFlagId &&
    request.destinationFlagId === destinationFlagId &&
    request.resourceId === resourceId &&
    request.state !== 'delivered'
  );
}

export function createTransportTasks(state) {
  state.transportRequests ??= [];
  const buildings = state.buildings ?? [];
  let created = 0;

  for (const source of buildings) {
    if (!source.active) continue;
    const sourceType = getBuildingType(state, source);
    const sourceFlag = getBuildingFlag(state, source.id);
    if (!sourceType?.output?.resourceId || !sourceFlag) continue;

    const resourceId = sourceType.output.resourceId;
    if (getBuildingInventory(state, source.id, resourceId) <= 0) continue;

    const destination = buildings.find((candidate) => {
      if (!candidate.active || candidate.id === source.id) return false;
      const type = getBuildingType(state, candidate);
      const destinationFlag = getBuildingFlag(state, candidate.id);
      if (!type?.input?.[resourceId] || !destinationFlag) return false;
      if (candidate.ownerId !== source.ownerId) return false;
      if (hasOpenRequest(state, sourceFlag.id, destinationFlag.id, resourceId)) return false;
      return Boolean(findFlagRoute(state, sourceFlag.id, destinationFlag.id));
    });

    if (!destination) continue;
    const destinationFlag = getBuildingFlag(state, destination.id);
    const requestId = `transport-${source.id}-${destination.id}-${resourceId}-${state.transportRequests.length + 1}`;
    if (stageBuildingOutputAtFlag(state, source.id, resourceId, 1) !== 1) continue;
    state.transportRequests.push(createBuildingTransportRequest(
      state,
      requestId,
      source.ownerId,
      resourceId,
      1,
      source.id,
      destination.id
    ));
    const request = state.transportRequests[state.transportRequests.length - 1];
    if (!request || !destinationFlag) continue;
    created += 1;
  }

  return created;
}

export function getReadyTransportRequests(state) {
  return (state.transportRequests ?? []).filter((request) => request.state === 'ready' || request.state === 'waiting');
}
