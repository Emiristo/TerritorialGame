const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function tileId(x, y) {
  return `${x}-${y}`;
}

function areAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
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
  const startFlag = (state.flags ?? []).find((flag) => flag.id === road.startFlagId);
  const endFlag = (state.flags ?? []).find((flag) => flag.id === road.endFlagId);
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
    const flag = (state.flags ?? []).find((item) => item.id === flagId);
    if (flag && !flag.roadIds.includes(road.id)) flag.roadIds.push(road.id);
  }
  return road;
}

export function removeRoad(state, roadId) {
  const index = (state.roads ?? []).findIndex((road) => road.id === roadId);
  if (index < 0) return null;
  const [removed] = state.roads.splice(index, 1);
  for (const flag of state.flags ?? []) {
    flag.roadIds = flag.roadIds.filter((id) => id !== roadId);
  }
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
