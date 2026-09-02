const DIRECTIONS = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const MAX_ROADS_PER_FLAG = 4;
const MIN_ROAD_CELLS = 2;

function tileId(x, y) {
  return `${x}-${y}`;
}

function areAdjacent(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1;
}

function directionIndex(dx, dy) {
  return DIRECTIONS.findIndex(([x, y]) => x === Math.sign(dx) && y === Math.sign(dy));
}

function directionChange(a, b) {
  if (a == null || b == null) return 0;
  const difference = Math.abs(a - b);
  return Math.min(difference, DIRECTIONS.length - difference);
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

function countRoadsForFlag(state, flagId) {
  return (state.roads ?? []).filter(
    (road) => road.active && (road.startFlagId === flagId || road.endFlagId === flagId),
  ).length;
}

function occupiedRoadCells(state) {
  return new Set((state.roads ?? []).filter((road) => road.active).flatMap((road) => road.cells));
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
  if (!startFlag || !endFlag || startFlag.id === endFlag.id || !Array.isArray(road.cells)) return false;
  if (road.cells.length < MIN_ROAD_CELLS) return false;

  const expectedStart = tileId(startFlag.x, startFlag.y);
  const expectedEnd = tileId(endFlag.x, endFlag.y);
  if (road.cells[0] !== expectedStart || road.cells[road.cells.length - 1] !== expectedEnd) return false;

  const seen = new Set();
  const roadCells = occupiedRoadCells(state);
  roadCells.delete(expectedStart);
  roadCells.delete(expectedEnd);

  let previousDirection = null;
  for (let index = 0; index < road.cells.length; index += 1) {
    const currentId = road.cells[index];
    if (seen.has(currentId)) return false;
    seen.add(currentId);

    const tile = state.tiles.find((item) => item.id === currentId);
    if (!tile) return false;

    if (index > 0) {
      const previous = state.tiles.find((item) => item.id === road.cells[index - 1]);
      if (!areAdjacent(previous, tile)) return false;
      const currentDirection = directionIndex(tile.x - previous.x, tile.y - previous.y);
      if (currentDirection < 0 || directionChange(previousDirection, currentDirection) > 1) return false;
      previousDirection = currentDirection;
    }

    if (index > 0 && index < road.cells.length - 1 && roadCells.has(currentId)) return false;
  }

  return true;
}

export function addRoad(state, road) {
  if (!isRoadPathValid(state, road)) throw new Error('Road path is invalid');
  state.roads ??= [];
  if (state.roads.some((item) => item.id === road.id)) throw new Error(`Road already exists: ${road.id}`);
  if (road.startFlagId === road.endFlagId) throw new Error('Road requires two different flags');
  if (countRoadsForFlag(state, road.startFlagId) >= MAX_ROADS_PER_FLAG) throw new Error('Start flag has reached the road limit');
  if (countRoadsForFlag(state, road.endFlagId) >= MAX_ROADS_PER_FLAG) throw new Error('End flag has reached the road limit');

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

function gridDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function findNearestFlag(state, flagId) {
  const startFlag = getFlag(state, flagId);
  if (!startFlag) return null;

  return (state.flags ?? [])
    .filter((flag) => flag.id !== flagId)
    .sort((a, b) => {
      const distanceDifference = gridDistance(startFlag, a) - gridDistance(startFlag, b);
      return distanceDifference || String(a.id).localeCompare(String(b.id));
    })[0] ?? null;
}

function getShortestPaths(state, startFlag, endFlag) {
  const startId = tileId(startFlag.x, startFlag.y);
  const endId = tileId(endFlag.x, endFlag.y);
  const blocked = occupiedRoadCells(state);
  blocked.delete(startId);
  blocked.delete(endId);

  const startState = `${startId}|8`;
  const distances = new Map([[startState, 0]]);
  const parents = new Map();
  const queue = [{ x: startFlag.x, y: startFlag.y, direction: 8, stateId: startState }];
  let head = 0;
  let targetDistance = null;

  while (head < queue.length) {
    const current = queue[head++];
    const currentDistance = distances.get(current.stateId);
    if (targetDistance != null && currentDistance >= targetDistance) continue;

    for (let nextDirection = 0; nextDirection < DIRECTIONS.length; nextDirection += 1) {
      if (current.direction !== 8 && directionChange(current.direction, nextDirection) > 1) continue;
      const [dx, dy] = DIRECTIONS[nextDirection];
      const x = current.x + dx;
      const y = current.y + dy;
      const nextId = tileId(x, y);
      const tile = state.tiles.find((item) => item.id === nextId);
      if (!tile || blocked.has(nextId)) continue;

      const nextDistance = currentDistance + 1;
      const nextStateId = `${nextId}|${nextDirection}`;
      const previousDistance = distances.get(nextStateId);
      if (previousDistance == null || nextDistance < previousDistance) {
        distances.set(nextStateId, nextDistance);
        parents.set(nextStateId, [current.stateId]);
        queue.push({ x, y, direction: nextDirection, stateId: nextStateId });
      } else if (nextDistance === previousDistance) {
        parents.get(nextStateId).push(current.stateId);
      }

      if (nextId === endId) {
        if (targetDistance == null || nextDistance < targetDistance) targetDistance = nextDistance;
      }
    }
  }

  if (targetDistance == null || targetDistance + 1 < MIN_ROAD_CELLS) return [];

  const endStates = [...distances.entries()]
    .filter(([stateId, distance]) => stateId.startsWith(`${endId}|`) && distance === targetDistance)
    .map(([stateId]) => stateId);

  const paths = [];
  const path = [endId];
  const seenPaths = new Set();

  function collect(stateId) {
    if (stateId === startState) {
      const cells = [...path].reverse();
      const key = cells.join('|');
      if (!seenPaths.has(key)) {
        seenPaths.add(key);
        paths.push(cells);
      }
      return;
    }
    for (const parent of parents.get(stateId) ?? []) {
      path.push(parent.split('|')[0]);
      collect(parent);
      path.pop();
    }
  }

  for (const endState of endStates) collect(endState);
  return paths;
}

export function findShortestRoadPaths(state, startFlagId, endFlagId) {
  const startFlag = getFlag(state, startFlagId);
  const endFlag = getFlag(state, endFlagId);
  if (!startFlag || !endFlag || startFlag.id === endFlag.id) return [];
  if (countRoadsForFlag(state, startFlagId) >= MAX_ROADS_PER_FLAG) return [];
  if (countRoadsForFlag(state, endFlagId) >= MAX_ROADS_PER_FLAG) return [];
  return getShortestPaths(state, startFlag, endFlag);
}

export function buildRoadToNearestFlag(state, startFlagId, roadId) {
  const startFlag = getFlag(state, startFlagId);
  const endFlag = findNearestFlag(state, startFlagId);
  if (!startFlag) throw new Error(`Unknown flag: ${startFlagId}`);
  if (!endFlag) return null;
  if (!roadId) throw new Error('Road id is required');

  const paths = findShortestRoadPaths(state, startFlagId, endFlag.id);
  if (paths.length === 0) return null;
  if (paths.length > Math.min(MAX_ROADS_PER_FLAG - countRoadsForFlag(state, startFlagId), MAX_ROADS_PER_FLAG - countRoadsForFlag(state, endFlag.id))) return null;

  const roads = paths.map((cells, index) =>
    addRoad(state, createRoad(index === 0 ? roadId : `${roadId}-${index + 1}`, startFlag.id, endFlag.id, cells)),
  );
  return roads.length === 1 ? roads[0] : roads;
}
