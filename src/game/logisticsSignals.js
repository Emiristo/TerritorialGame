export function markLogisticsDirty(state, sourceBuildingId, resourceId = null) {
  state.logisticsDirtySources ??= new Set();
  state.logisticsDirtySources.add(`${sourceBuildingId}:${resourceId ?? '*'}`);
}
