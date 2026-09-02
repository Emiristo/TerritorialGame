import { BUILDING_TYPES } from './buildings.js';

export const WORK_ZONE_DEFAULT_RADIUS = 5;

function findBuilding(state, buildingId) {
  return (state.buildings ?? []).find((building) => building.id === buildingId) ?? null;
}

function findWorker(state, workerId) {
  return (state.workers ?? []).find((worker) => worker.id === workerId) ?? null;
}

function findTile(state, tileId) {
  return (state.tiles ?? []).find((tile) => tile.id === tileId) ?? null;
}

function findBuildingType(building) {
  return Object.values(BUILDING_TYPES).find((type) => type.id === building?.typeId) ?? null;
}

function chebyshevDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function getWorkZoneRadius(state, building) {
  const type = findBuildingType(building);
  if (type?.workRadius == null) return null;
  return Number(type.workRadius);
}

export function getWorkZoneCells(state, zone) {
  const center = findTile(state, zone?.centerTileId);
  if (!center || zone?.radius == null || zone.radius < 0) return [];
  return (state.tiles ?? []).filter((tile) => chebyshevDistance(center, tile) <= zone.radius);
}

export function createWorkZone(id, ownerId, buildingId, centerTileId, radius) {
  return { id, ownerId, buildingId, centerTileId, radius, workerIds: [] };
}

export function getWorkZoneForBuilding(state, buildingId) {
  return (state.workZones ?? []).find((zone) => zone.buildingId === buildingId) ?? null;
}

export function createWorkZoneForBuilding(state, buildingId, id = `work-zone-${buildingId}`) {
  const building = findBuilding(state, buildingId);
  if (!building || !building.constructionComplete || !building.active) return null;
  const existing = getWorkZoneForBuilding(state, buildingId);
  if (existing) return existing;
  const radius = getWorkZoneRadius(state, building);
  if (radius == null) return null;
  const center = findTile(state, building.tileId);
  if (!center) return null;
  const zone = createWorkZone(id, building.ownerId, building.id, center.id, radius);
  state.workZones ??= [];
  state.workZones.push(zone);
  return zone;
}

export function syncWorkZones(state) {
  state.workZones ??= [];
  const activeBuildingIds = new Set(
    (state.buildings ?? [])
      .filter((building) => building.active && building.constructionComplete && getWorkZoneRadius(state, building) != null)
      .map((building) => building.id),
  );
  for (const zone of state.workZones) {
    if (!activeBuildingIds.has(zone.buildingId)) {
      for (const workerId of zone.workerIds ?? []) {
        const worker = findWorker(state, workerId);
        if (worker?.zoneId === zone.id) {
          worker.zoneId = null;
          worker.state = 'idle';
          worker.buildingId = null;
        }
      }
    }
  }
  state.workZones = state.workZones.filter((zone) => activeBuildingIds.has(zone.buildingId));
  for (const building of state.buildings ?? []) {
    if (activeBuildingIds.has(building.id)) createWorkZoneForBuilding(state, building.id);
  }
  return state;
}

export function getWorkZoneCellIds(state, zoneId) {
  const zone = (state.workZones ?? []).find((item) => item.id === zoneId);
  return getWorkZoneCells(state, zone).map((tile) => tile.id);
}

export function isTileInWorkZone(state, zoneId, tileId) {
  return getWorkZoneCellIds(state, zoneId).includes(tileId);
}

export function canWorkerUseWorkZone(state, workerId, zoneId) {
  const worker = findWorker(state, workerId);
  const zone = (state.workZones ?? []).find((item) => item.id === zoneId);
  if (!worker || !zone) return false;
  return worker.ownerId === zone.ownerId;
}

export function assignWorkerToWorkZone(state, workerId, zoneId) {
  const worker = findWorker(state, workerId);
  const zone = (state.workZones ?? []).find((item) => item.id === zoneId);
  if (!worker || !zone || !canWorkerUseWorkZone(state, workerId, zoneId)) return false;
  for (const otherZone of state.workZones ?? []) {
    otherZone.workerIds = (otherZone.workerIds ?? []).filter((id) => id !== workerId);
  }
  zone.workerIds ??= [];
  if (!zone.workerIds.includes(workerId)) zone.workerIds.push(workerId);
  worker.zoneId = zoneId;
  worker.buildingId = zone.buildingId;
  worker.state = 'working';
  return true;
}

export function assignWorkerToBuilding(state, workerId, buildingId, zoneId, targetTileId = null) {
  const worker = findWorker(state, workerId);
  const building = findBuilding(state, buildingId);
  const zone = (state.workZones ?? []).find((item) => item.id === zoneId);
  const type = findBuildingType(building);
  if (!worker || !building || !zone || !type || !building.active || !building.constructionComplete) return false;
  if (worker.ownerId !== building.ownerId || worker.typeId !== type.workerTypeId) return false;
  if (zone.buildingId !== building.id || zone.ownerId !== building.ownerId) return false;
  if (targetTileId != null && !isTileInWorkZone(state, zone.id, targetTileId)) return false;
  if (!assignWorkerToWorkZone(state, workerId, zone.id)) return false;
  worker.targetTileId = targetTileId;
  building.workerIds ??= [];
  if (!building.workerIds.includes(worker.id)) building.workerIds.push(worker.id);
  return true;
}

export function removeWorkZoneForBuilding(state, buildingId) {
  const zone = getWorkZoneForBuilding(state, buildingId);
  if (!zone) return false;
  for (const workerId of zone.workerIds ?? []) {
    const worker = findWorker(state, workerId);
    if (worker?.zoneId === zone.id) {
      worker.zoneId = null;
      worker.buildingId = null;
      worker.targetTileId = null;
      worker.state = 'idle';
    }
  }
  state.workZones = (state.workZones ?? []).filter((item) => item.id !== zone.id);
  const building = findBuilding(state, buildingId);
  if (building) building.workerIds = (building.workerIds ?? []).filter((id) => !zone.workerIds.includes(id));
  return true;
}
