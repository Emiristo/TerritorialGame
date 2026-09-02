const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function tileId(x, y) {
  return `${x}-${y}`;
}

function areAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

function getFlag(state, flagId) {
  return (state.flags ?? []).find((flag) => flag.id === flagId) ?? null;
}

function rebuildNetworkFromRoads(state) {
  const flags = state.flags ?? [];
  const roads = state.roads ?? [];
  const adjacency = Object.fromEntries(flags.map((flag) => [flag.id, []]));

  for (const road of roads) {
    if (!road.active || !adjacency[road.startFlagId] || !adjacency[road.endFlagId]) continue;
    adjacency[road.startFlagId].push({ flagId: road.endFlagId, roadId: road.id });
    adjacency[road.endFlagId].push({ flagId: road.startFlagId, roadId: road.id });
  }

  state.logisticsNetwork = { adjacency };
  for (const flag of flags) {
    flag.connected = adjacency[flag.id].length > 0;
  }
}

export function createRoad(id, startFlagId, endFlagId, cells = []) {
  return {
    id,
    startFlagId,
    endFlagId,
    cells: [...cells],
    active: true,
  };
}

export function isRoadPathValid(state, road) {
  const startFlag = getFlag(state, road.startFlagId);
  const endFlag = getFlag(state, road.endFlagId);
  if (!startFlag || !endFlag || !Array.isArray(road.cells) || road.cells.length === 0) return false;

  const expectedStart = tileId(startFlag.x, startFlag.y);
  const expectedEnd = tileId(endFlag.x, endFlag.y);
  if (road.cells[0] !== expectedStart || road.cells[road.cells.length - 1] !== expectedEnd) return false;

  for (let index = 0; index < road.cells.length; index += 1) {
    const tile = state.tiles.find((item) => item.id === road.cells[index]);
    if (!tile) return false;
    if (index > 0) {
      const previous = state.tiles.find((item) => item.id === road.cells[index - 1]);
      if (!areAdjacent(previous, tile)) return false;
    }
  }
  return true;
}

export function addRoad(state, road) {
  if (!isRoadPathValid(state, road)) throw new Error('Road path is invalid');
  state.roads ??= [];
  if (state.roads.some((item) => item.id === road.id)) throw new Error(`Road already exists: ${road.id}`);
  if (road.startFlagId === road.endFlagId) throw new Error('Road requires two different flags');
  state.roads.push(road);

  for (const flagId of [road.startFlagId, road.endFlagId]) {
    const flag = getFlag(state, flagId);
    if (flag && !flag.roadIds.includes(road.id)) flag.roadIds.push(road.id);
  }

  rebuildNetworkFromRoads(state);
  return road;
}

export function removeRoad(state, roadId) {
  const index = (state.roads ?? []).findIndex((road) => road.id === roadId);
  if (index < 0) return null;
  const [removed] = state.roads.splice(index, 1);
  for (const flag of state.flags ?? []) {
    flag.roadIds = flag.roadIds.filter((id) => id !== roadId);
  }
  rebuildNetworkFromRoads(state);
  return removed;
}

export function removeRoadsForFlag(state, flagId) {
  const ids = (state.roads ?? [])
    .filter((road) => road.startFlagId === flagId || road.endFlagId === flagId)
    .map((road) => road.id);
  for (const id of ids) removeRoad(state, id);
  return ids;
}

export function getRoadAtTile(state, tileIdValue) {
  return (state.roads ?? []).filter((road) => road.cells.includes(tileIdValue));
}

export function getRoadNeighbors(state, tileIdValue) {
  const tile = state.tiles.find((item) => item.id === tileIdValue);
  if (!tile) return [];
  return DIRECTIONS
    .map(([dx, dy]) => state.tiles.find((item) => item.x === tile.x + dx && item.y === tile.y + dy))
    .filter(Boolean)
    .filter((candidate) => getRoadAtTile(state, candidate.id).some((road) => road.cells.includes(tileIdValue)));
}

function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function findNearestFlag(state, flagId) {
  const startFlag = getFlag(state, flagId);
  if (!startFlag) return null;

  return (state.flags ?? [])
    .filter((flag) => flag.id !== flagId)
    .sort((a, b) => {
      const distanceDifference = manhattanDistance(startFlag, a) - manhattanDistance(startFlag, b);
      return distanceDifference || String(a.id).localeCompare(String(b.id));
    })[0] ?? null;
}

export function buildRoadToNearestFlag(state, startFlagId, roadId) {
  const startFlag = getFlag(state, startFlagId);
  const endFlag = findNearestFlag(state, startFlagId);
  if (!startFlag) throw new Error(`Unknown flag: ${startFlagId}`);
  if (!endFlag) return null;
  if (!roadId) throw new Error('Road id is required');

  const cells = [tileId(startFlag.x, startFlag.y)];
  let x = startFlag.x;
  let y = startFlag.y;

  while (x !== endFlag.x) {
    x += Math.sign(endFlag.x - x);
    cells.push(tileId(x, y));
  }
  while (y !== endFlag.y) {
    y += Math.sign(endFlag.y - y);
    cells.push(tileId(x, y));
  }

  return addRoad(state, createRoad(roadId, startFlag.id, endFlag.id, cells));
}
