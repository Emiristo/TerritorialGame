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
  for (const flag of flags) flag.connected = adjacency[flag.id].length > 0;
}

function countRoadsForFlag(state, flagId) {
  return (state.roads ?? []).filter(
    (road) => road.active && (road.startFlagId === flagId || road.endFlagId === flagId),
  ).length;
}

function occupiedRoadCells(state) {
  return new Set((state.roads ?? []).filter((road) => road.active).flatMap((road) => road.cells));
}

function getTile(state, id) {
  return state.tiles.find((item) => item.id === id) ?? null;
}

function segmentsCross(a, b, c, d) {
  const orientation = (p, q, r) => {
    const value = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    return Math.sign(value);
  };
  const onSegment = (p, q, r) => (
    Math.min(p.x, r.x) <= q.x && q.x <= Math.max(p.x, r.x)
    && Math.min(p.y, r.y) <= q.y && q.y <= Math.max(p.y, r.y)
  );

  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;
  return false;
}

function roadsIntersect(state, candidate, existingRoad) {
  const candidateStart = getFlag(state, candidate.startFlagId);
  const candidateEnd = getFlag(state, candidate.endFlagId);
  const existingStart = getFlag(state, existingRoad.startFlagId);
  const existingEnd = getFlag(state, existingRoad.endFlagId);
  if (!candidateStart || !candidateEnd || !existingStart || !existingEnd) return false;

  for (let i = 0; i < candidate.cells.length - 1; i += 1) {
    const a = getTile(state, candidate.cells[i]);
    const b = getTile(state, candidate.cells[i + 1]);
    if (!a || !b) continue;
    for (let j = 0; j < existingRoad.cells.length - 1; j += 1) {
      const c = getTile(state, existingRoad.cells[j]);
      const d = getTile(state, existingRoad.cells[j + 1]);
      if (!c || !d || !segmentsCross(a, b, c, d)) continue;

      const candidateEndpoint = i === 0 || i === candidate.cells.length - 2;
      const existingEndpoint = j === 0 || j === existingRoad.cells.length - 2;
      if (candidateEndpoint && existingEndpoint) {
        const candidateFlagId = i === 0 ? candidate.startFlagId : candidate.endFlagId;
        const existingFlagId = j === 0 ? existingRoad.startFlagId : existingRoad.endFlagId;
        if (candidateFlagId === existingFlagId) continue;
      }
      return true;
    }
  }
  return false;
}

export function createRoad(id, startFlagId, endFlagId, cells = []) {
  return { id, startFlagId, endFlagId, cells: [...cells], active: true };
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
  const occupied = occupiedRoadCells(state);
  occupied.delete(expectedStart);
  occupied.delete(expectedEnd);
  let previousDirection = null;

  for (let index = 0; index < road.cells.length; index += 1) {
    const currentId = road.cells[index];
    if (seen.has(currentId)) return false;
    seen.add(currentId);

    const tile = getTile(state, currentId);
    if (!tile) return false;

    if (index > 0) {
      const previous = getTile(state, road.cells[index - 1]);
      if (!areAdjacent(previous, tile)) return false;
      const currentDirection = directionIndex(tile.x - previous.x, tile.y - previous.y);
      if (currentDirection < 0 || directionChange(previousDirection, currentDirection) > 1) return false;
      previousDirection = currentDirection;
    }

    if (index > 0 && index < road.cells.length - 1 && occupied.has(currentId)) return false;
  }

  for (const existingRoad of state.roads ?? []) {
    if (existingRoad.active && existingRoad.id !== road.id && roadsIntersect(state, road, existingRoad)) return false;
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
  for (const flag of state.flags ?? []) flag.roadIds = flag.roadIds.filter((id) => id !== roadId);
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
      const tile = getTile(state, nextId);
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
      if (nextId === endId && (targetDistance == null || nextDistance < targetDistance)) targetDistance = nextDistance;
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

function selectCompatiblePaths(state, paths) {
  const selected = [];
  const occupied = occupiedRoadCells(state);
  const used = new Set(occupied);

  for (const path of paths) {
    const interior = path.slice(1, -1);
    if (interior.some((cell) => used.has(cell))) continue;
    selected.push(path);
    for (const cell of interior) used.add(cell);
  }
  return selected;
}

export function buildRoadToNearestFlag(state, startFlagId, roadId) {
  const startFlag = getFlag(state, startFlagId);
  const endFlag = findNearestFlag(state, startFlagId);
  if (!startFlag) throw new Error(`Unknown flag: ${startFlagId}`);
  if (!endFlag) return null;
  if (!roadId) throw new Error('Road id is required');

  const paths = selectCompatiblePaths(state, findShortestRoadPaths(state, startFlagId, endFlag.id));
  const capacity = Math.min(
    MAX_ROADS_PER_FLAG - countRoadsForFlag(state, startFlagId),
    MAX_ROADS_PER_FLAG - countRoadsForFlag(state, endFlag.id),
  );
  const selectedPaths = paths.slice(0, capacity);
  if (selectedPaths.length === 0) return null;

  const roads = selectedPaths.map((cells, index) =>
    addRoad(state, createRoad(index === 0 ? roadId : `${roadId}-${index + 1}`, startFlag.id, endFlag.id, cells)),
  );
  return roads.length === 1 ? roads[0] : roads;
}
