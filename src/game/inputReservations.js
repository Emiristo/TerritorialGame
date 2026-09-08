export const INPUT_SLOT_STATES = Object.freeze({ RESERVED: 'reserved' });
export const INPUT_SLOT_CAPACITY = 4;

function getBuilding(state, buildingId) {
  return (state.buildings ?? []).find((building) => building.id === buildingId) ?? null;
}

function ensureReservations(building) {
  building.inputSlotReservations ??= Array(INPUT_SLOT_CAPACITY).fill(null);
  if (building.inputSlotReservations.length !== INPUT_SLOT_CAPACITY) {
    building.inputSlotReservations = Array(INPUT_SLOT_CAPACITY).fill(null).map((_, index) => building.inputSlotReservations[index] ?? null);
  }
  return building.inputSlotReservations;
}

export function getInputSlotReservations(state, buildingId) {
  const building = getBuilding(state, buildingId);
  return building ? ensureReservations(building) : [];
}

export function getReservedInputSlotCount(state, buildingId) {
  return getInputSlotReservations(state, buildingId).filter(Boolean).length;
}

export function getFreeInputSlotCount(state, buildingId) {
  return INPUT_SLOT_CAPACITY - getReservedInputSlotCount(state, buildingId)
    - ((getBuilding(state, buildingId)?.inputStorageSlots ?? []).filter(Boolean).length);
}

export function findReservedInputSlot(state, buildingId, requestId) {
  if (!requestId) return -1;
  return getInputSlotReservations(state, buildingId).findIndex((reservation) => reservation?.requestId === requestId);
}

export function reserveBuildingInputSlot(state, buildingId, resourceId, requestId) {
  if (!resourceId || !requestId) return -1;
  const building = getBuilding(state, buildingId);
  if (!building) return -1;
  const slots = building.inputStorageSlots ?? Array(INPUT_SLOT_CAPACITY).fill(null);
  const reservations = ensureReservations(building);
  if (slots.length !== INPUT_SLOT_CAPACITY) return -1;
  if (reservations.some((reservation) => reservation?.requestId === requestId)) return -1;
  const index = slots.findIndex((resource, slotIndex) => resource == null && reservations[slotIndex] == null);
  if (index < 0) return -1;
  reservations[index] = { state: INPUT_SLOT_STATES.RESERVED, requestId, resourceId };
  return index;
}

export function releaseBuildingInputSlot(state, buildingId, requestId) {
  const building = getBuilding(state, buildingId);
  if (!building || !requestId) return false;
  const reservations = ensureReservations(building);
  const index = reservations.findIndex((reservation) => reservation?.requestId === requestId);
  if (index < 0) return false;
  reservations[index] = null;
  return true;
}

export function occupyReservedInputSlot(state, buildingId, requestId, resourceId) {
  const building = getBuilding(state, buildingId);
  if (!building || !requestId || !resourceId) return false;
  const slots = building.inputStorageSlots ?? Array(INPUT_SLOT_CAPACITY).fill(null);
  const reservations = ensureReservations(building);
  const index = reservations.findIndex((reservation) => reservation?.requestId === requestId);
  if (index < 0 || slots[index] != null || reservations[index].resourceId !== resourceId) return false;
  slots[index] = resourceId;
  reservations[index] = null;
  building.inputStorageSlots = slots;
  return true;
}
