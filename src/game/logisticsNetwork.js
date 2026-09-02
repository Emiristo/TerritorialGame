function getFlag(state, flagId) {
  return (state.flags ?? []).find((flag) => flag.id === flagId) ?? null;
}

export function rebuildLogisticsNetwork(state) {
  const flags = state.flags ?? [];
  const roads = state.roads ?? [];
  const adjacency = Object.fromEntries(flags.map((flag) => [flag.id, []]));

  for (const road of roads) {
    if (!road.active || !getFlag(state, road.startFlagId) || !getFlag(state, road.endFlagId)) continue;
    adjacency[road.startFlagId]?.push({ flagId: road.endFlagId, roadId: road.id });
    adjacency[road.endFlagId]?.push({ flagId: road.startFlagId, roadId: road.id });
  }

  state.logisticsNetwork = { adjacency };
  for (const flag of flags) {
    flag.connected = adjacency[flag.id].length > 0;
  }
  return state.logisticsNetwork;
}

export function areFlagsConnected(state, startFlagId, endFlagId) {
  if (startFlagId === endFlagId) return Boolean(getFlag(state, startFlagId));
  const network = state.logisticsNetwork ?? rebuildLogisticsNetwork(state);
  if (!network.adjacency[startFlagId] || !network.adjacency[endFlagId]) return false;

  const visited = new Set([startFlagId]);
  const queue = [startFlagId];
  while (queue.length) {
    const current = queue.shift();
    for (const edge of network.adjacency[current] ?? []) {
      if (edge.flagId === endFlagId) return true;
      if (!visited.has(edge.flagId)) {
        visited.add(edge.flagId);
        queue.push(edge.flagId);
      }
    }
  }
  return false;
}

export function findFlagRoute(state, startFlagId, endFlagId) {
  if (startFlagId === endFlagId) return { flagIds: [startFlagId], roadIds: [] };
  const network = state.logisticsNetwork ?? rebuildLogisticsNetwork(state);
  if (!network.adjacency[startFlagId] || !network.adjacency[endFlagId]) return null;

  const queue = [startFlagId];
  const previous = new Map([[startFlagId, null]]);
  const previousRoad = new Map();

  while (queue.length) {
    const current = queue.shift();
    if (current === endFlagId) break;
    for (const edge of network.adjacency[current] ?? []) {
      if (previous.has(edge.flagId)) continue;
      previous.set(edge.flagId, current);
      previousRoad.set(edge.flagId, edge.roadId);
      queue.push(edge.flagId);
    }
  }

  if (!previous.has(endFlagId)) return null;
  const flagIds = [];
  const roadIds = [];
  let current = endFlagId;
  while (current !== null) {
    flagIds.push(current);
    const roadId = previousRoad.get(current);
    if (roadId) roadIds.push(roadId);
    current = previous.get(current);
  }
  flagIds.reverse();
  roadIds.reverse();
  return { flagIds, roadIds };
}

export function rebuildAndGetFlagRoute(state, startFlagId, endFlagId) {
  rebuildLogisticsNetwork(state);
  return findFlagRoute(state, startFlagId, endFlagId);
}
