import { BUILDING_TYPES, addBuilding } from '../src/game/buildings.js';
import { addRoad, createRoad, findShortestRoadPaths } from '../src/game/roads.js';
import { deliverCarrierToFlag, loadCarrierFromFlag } from '../src/game/carriers.js';
import { createTransportTasks } from '../src/game/logisticsManager.js';

function ensurePlayer(state) {
  state.player ??= { id: 'player', resources: {} };
  state.player.id ??= 'player';
  state.player.resources ??= {};
  state.buildings ??= [];
  state.flags ??= [];
  state.roads ??= [];
  state.carriers ??= [];
  state.transportRequests ??= [];
}
function prepareWarehouseArea(state, x, y) {
  for (let dy = 0; dy < BUILDING_TYPES.WAREHOUSE.height; dy += 1) for (let dx = 0; dx < BUILDING_TYPES.WAREHOUSE.width; dx += 1) {
    const tile = state.tiles?.find((item) => item.x === x + dx && item.y === y + dy);
    if (tile) { tile.ownerId = state.player.id; tile.terrain = 'plains'; }
  }
}
function ensureWarehouse(state, resourceId, amount) {
  let warehouse = state.buildings.find((building) => building.active && building.ownerId === state.player.id && building.typeId === BUILDING_TYPES.WAREHOUSE.id);
  if (!warehouse) {
    prepareWarehouseArea(state, 5, 5);
    warehouse = addBuilding(state, `test-warehouse-${state.buildings.length}`, state.player.id, BUILDING_TYPES.WAREHOUSE.id, '5-5');
    warehouse.active = true;
    warehouse.constructionComplete = true;
    warehouse.inventory = {};
  }
  warehouse.inventory ??= {};
  warehouse.inventory[resourceId] = Number(warehouse.inventory[resourceId] ?? 0) + amount;
  return state.flags.find((item) => item.buildingId === warehouse.id);
}
function ensureRoad(state, sourceFlag, destinationFlag, buildingId) {
  const existing = state.roads.find((road) => road.active && ((road.startFlagId === sourceFlag.id && road.endFlagId === destinationFlag.id) || (road.startFlagId === destinationFlag.id && road.endFlagId === sourceFlag.id)));
  if (existing) return existing;
  const path = findShortestRoadPaths(state, sourceFlag.id, destinationFlag.id)[0];
  if (!path) throw new Error('Test road path not found');
  return addRoad(state, createRoad(`test-construction-road-${buildingId}-${state.roads.length}`, sourceFlag.id, destinationFlag.id, path));
}
function getRoadCarrier(state, road) {
  return state.carriers.find((carrier) => carrier.role === 'road' && carrier.roadId === road.id && !carrier.cargo) ?? null;
}
export function deliverConstructionMaterialViaLogistics(state, building, resourceId, amount = 1) {
  ensurePlayer(state);
  const requested = Math.max(0, Math.floor(Number(amount) || 0));
  if (requested === 0) return 0;
  const destinationFlag = state.flags.find((item) => item.id === building.flagId || item.buildingId === building.id);
  if (!destinationFlag) throw new Error(`Construction flag not found: ${building.id}`);
  const warehouseFlag = ensureWarehouse(state, resourceId, requested);
  let delivered = 0;
  const road = ensureRoad(state, warehouseFlag, destinationFlag, building.id);
  const carrier = getRoadCarrier(state, road);
  if (!carrier) throw new Error(`Road carrier not found: ${road.id}`);
  for (let unit = 0; unit < requested; unit += 1) {
    const before = state.transportRequests.length;
    createTransportTasks(state);
    const request = state.transportRequests.slice(before).find((item) => item.destinationBuildingId === building.id && item.resourceId === resourceId && item.state !== 'delivered');
    if (!request) break;
    if (!loadCarrierFromFlag(state, carrier.id, request.id)) break;
    if (!deliverCarrierToFlag(state, carrier.id)) break;
    delivered += 1;
  }
  return delivered;
}
