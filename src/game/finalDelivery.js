import { addInventoryToBuilding, getFlagCargo, removeCargoFromFlag } from './carriers.js';

function findWorker(state, workerId) { return (state.workers ?? []).find((worker) => worker.id === workerId) ?? null; }

export function assignWorkerFinalDelivery(state, workerId, requestId) {
  const worker = findWorker(state, workerId);
  const request = (state.transportRequests ?? []).find((item) => item.id === requestId) ?? null;
  if (!worker || !request || request.state !== 'at_destination' || request.destinationBuildingId !== worker.buildingId || worker.ownerId !== request.ownerId || worker.cargo || worker.logisticsTask) return false;
  if (getFlagCargo(state, request.destinationFlagId, request.resourceId) < 1) return false;
  if (removeCargoFromFlag(state, request.destinationFlagId, request.resourceId, 1) !== 1) return false;
  worker.logisticsTask = { type: 'final_delivery', requestId };
  worker.cargo = { requestId, resourceId: request.resourceId, amount: 1, fromFlagId: request.destinationFlagId, toBuildingId: worker.buildingId };
  worker.state = 'carrying';
  return true;
}

export function completeWorkerFinalDelivery(state, workerId) {
  const worker = findWorker(state, workerId);
  if (!worker?.cargo || worker.logisticsTask?.type !== 'final_delivery') return false;
  const request = (state.transportRequests ?? []).find((item) => item.id === worker.logisticsTask.requestId) ?? null;
  if (!request || request.destinationBuildingId !== worker.buildingId) return false;
  addInventoryToBuilding(state, worker.buildingId, worker.cargo.resourceId, worker.cargo.amount);
  request.delivered = Number(request.delivered ?? 0) + worker.cargo.amount;
  request.state = request.delivered >= Number(request.amount ?? 0) ? 'delivered' : 'at_destination';
  worker.cargo = null;
  worker.logisticsTask = null;
  worker.state = 'idle';
  return true;
}

export function advanceWorkerFinalDelivery(state, workerId, requestId) {
  const worker = findWorker(state, workerId);
  if (!worker) return false;
  return worker.cargo ? completeWorkerFinalDelivery(state, workerId) : assignWorkerFinalDelivery(state, workerId, requestId);
}
