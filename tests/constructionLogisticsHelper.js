import { BUILDING_TYPES, createBuilding } from '../src/game/buildings.js';
import { createFlag } from '../src/game/flags.js';
import { addRoad, createRoad } from '../src/game/roads.js';
import { addCarrier, createCarrier, deliverCarrierToFlag, loadCarrierFromFlag } from '../src/game/carriers.js';
import { createTransportTasks } from '../src/game/logisticsManager.js';
import { advanceConstruction } from '../src/game/construction.js';

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

function ensureWarehouse(state, resourceId, amount) {
  let warehouse = state.buildings.find((building) => building.active && building.ownerId === state.player.id
    && (building.typeId === BUILDING_TYPES.WAREHOUSE.id || building.typeId === BUILDING_TYPES.HEADQUARTERS.id));
  if (!warehouse) {
    warehouse = createBuilding(`test-warehouse-${state.buildings.length}`, state.player.id, BUILDING_TYPES.WAREHOUSE.id, '5-5');
    warehouse.active = true;
    warehouse.constructionComplete = true;
    state.buildings.push(warehouse);
  }
  warehouse.inventory ??= {};
  warehouse.inventory[resourceId] = Number(warehouse.inventory[resourceId] ?? 0) + amount;
  let flag = state.flags.find((item) => item.buildingId === warehouse.id);
  if (!flag) {
    flag = createFlag(`${warehouse.id}-flag`, warehouse.id, warehouse.ownerId, 5, 8);
    flag.constructionStorage = {};
    state.flags.push(flag);
  }
  return { warehouse, flag };
}

function ensureConstructionFlag(state, building) {
  let flag = state.flags.find((item) => item.id === building.flagId || item.buildingId === building.id);
  if (!flag) {
    building.flagId ??= `${building.id}-flag`;
    flag = createFlag(building.flagId, building.id, building.ownerId, 20 + state.flags.length, 8);
    flag.constructionStorage = {};
    state.flags.push(flag);
  }
  building.flagId = flag.id;
  flag.constructionStorage ??= {};
  return flag;
}

function ensureRoad(state, sourceFlag, destinationFlag, buildingId) {
  const existing = state.roads.find((road) => road.active
    && ((road.startFlagId === sourceFlag.id && road.endFlagId === destinationFlag.id)
      || (road.startFlagId === destinationFlag.id && road.endFlagId === sourceFlag.id)));
  if (existing) return existing;
  const road = createRoad(`test-construction-road-${buildingId}-${state.roads.length}`, sourceFlag.id, destinationFlag.id,
    [`${sourceFlag.x}-${sourceFlag.y}`, `${destinationFlag.x}-${destinationFlag.y}`]);
  return addRoad(state, road);
}

export function deliverConstructionMaterialViaLogistics(state, building, resourceId, amount = 1) {
  ensurePlayer(state);
  const requested = Math.max(0, Math.floor(Number(amount) || 0));
  let delivered = 0;
  const destinationFlag = ensureConstructionFlag(state, building);
  for (let unit = 0; unit < requested; unit += 1) {
    const { flag: warehouseFlag } = ensureWarehouse(state, resourceId, 1);
    const road = ensureRoad(state, warehouseFlag, destinationFlag, building.id);
    const before = state.transportRequests.length;
    createTransportTasks(state);
    const request = state.transportRequests.slice(before).find((item) => item.destinationBuildingId === building.id && item.resourceId === resourceId)
      ?? state.transportRequests.find((item) => item.destinationBuildingId === building.id && item.resourceId === resourceId && item.state !== 'delivered');
    if (!request) break;
    const carrier = createCarrier(`test-road-carrier-${building.id}-${resourceId}-${unit}-${state.carriers.length}`, state.player.id, road.id);
    addCarrier(state, carrier);
    if (!loadCarrierFromFlag(state, carrier.id, request.id)) break;
    if (!deliverCarrierToFlag(state, carrier.id)) break;
    advanceConstruction(state, building, 0);
    delivered += 1;
  }
  return delivered;
}
