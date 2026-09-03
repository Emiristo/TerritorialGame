function getFlag(state, flagId) {
  return (state.flags ?? []).find((flag) => flag.id === flagId) ?? null;
}

function getRoad(state, roadId) {
  return (state.roads ?? []).find((road) => road.id === roadId && road.active) ?? null;
}

function getRoadWeight(state, roadId) {
  const road = getRoad(state, roadId);
  return road ? Math.max(1, road.cells?.length ?? 1) : Number.MAX_SAFE_INTEGER;
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
    flag.roadIds = adjacency[flag.id].map((edge) => edge.roadId);
  }
  return state.logisticsNetwork;
}

export function getConnectedFlagIds(state, flagId) {
  return (state.logisticsNetwork?.adjacency?.[flagId] ?? []).map((edge) => edge.flagId);
}

export function areFlagsConnected(state, startFlagId, endFlagId) {
  if (startFlagId === endFlagId) return Boolean(getFlag(state, startFlagId));
  const network = rebuildLogisticsNetwork(state);
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

function findShortestRoutes(state, network, startFlagId) {
  if (!network.adjacency[startFlagId]) return new Map();

  const distances = new Map([[startFlagId, 0]]);
  const previous = new Map([[startFlagId, null]]);
  const previousRoad = new Map();
  const unvisited = new Set(Object.keys(network.adjacency));

  while (unvisited.size) {
    let current = null;
    let currentDistance = Number.MAX_SAFE_INTEGER;
    for (const flagId of unvisited) {
      const distance = distances.get(flagId) ?? Number.MAX_SAFE_INTEGER;
      if (distance < currentDistance) {
        current = flagId;
        currentDistance = distance;
      }
    }
    if (current === null) break;

    unvisited.delete(current);
    for (const edge of network.adjacency[current] ?? []) {
      if (!unvisited.has(edge.flagId)) continue;
      const distance = currentDistance + getRoadWeight(state, edge.roadId);
      const known = distances.get(edge.flagId) ?? Number.MAX_SAFE_INTEGER;
      if (distance < known) {
        distances.set(edge.flagId, distance);
        previous.set(edge.flagId, current);
        previousRoad.set(edge.flagId, edge.roadId);
      }
    }
  }

  const routes = new Map();
  for (const [destinationFlagId] of distances) {
    const flagIds = [];
    const roadIds = [];
    let current = destinationFlagId;
    while (current !== null) {
      flagIds.push(current);
      const roadId = previousRoad.get(current);
      if (roadId) roadIds.push(roadId);
      current = previous.get(current);
    }
    flagIds.reverse();
    roadIds.reverse();
    routes.set(destinationFlagId, { flagIds, roadIds, distance: distances.get(destinationFlagId) });
  }
  return routes;
}

export function findShortestFlagRoutes(state, startFlagId) {
  const network = state.logisticsNetwork ?? rebuildLogisticsNetwork(state);
  return findShortestRoutes(state, network, startFlagId);
}

export function findFlagRoute(state, startFlagId, endFlagId) {
  if (startFlagId === endFlagId) return { flagIds: [startFlagId], roadIds: [] };
  const routes = findShortestFlagRoutes(state, startFlagId);
  return routes.get(endFlagId) ?? null;
}

export function getRoadsOnFlagRoute(state, startFlagId, endFlagId) {
  return findFlagRoute(state, startFlagId, endFlagId)?.roadIds ?? [];
}

export function rebuildAndGetFlagRoute(state, startFlagId, endFlagId) {
  rebuildLogisticsNetwork(state);
  return findFlagRoute(state, startFlagId, endFlagId);
}
