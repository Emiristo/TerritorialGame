export const MAP_DIRECTIONS = Object.freeze([
  Object.freeze({ id: 'east', dx: 1, dy: 0 }),
  Object.freeze({ id: 'southEast', dx: 1, dy: 1 }),
  Object.freeze({ id: 'south', dx: 0, dy: 1 }),
  Object.freeze({ id: 'southWest', dx: -1, dy: 1 }),
  Object.freeze({ id: 'west', dx: -1, dy: 0 }),
  Object.freeze({ id: 'northWest', dx: -1, dy: -1 }),
  Object.freeze({ id: 'north', dx: 0, dy: -1 }),
  Object.freeze({ id: 'northEast', dx: 1, dy: -1 }),
]);

export function createMapGeometry(width, height) {
  if (!Number.isInteger(width) || width <= 0) throw new Error('Map width must be a positive integer');
  if (!Number.isInteger(height) || height <= 0) throw new Error('Map height must be a positive integer');

  const inBounds = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < width && y < height;
  const tileId = (x, y) => (inBounds(x, y) ? `${x}-${y}` : null);
  const parseTileId = (id) => {
    if (typeof id !== 'string') return null;
    const separator = id.indexOf('-');
    if (separator <= 0) return null;
    const x = Number(id.slice(0, separator));
    const y = Number(id.slice(separator + 1));
    return Number.isInteger(x) && Number.isInteger(y) && inBounds(x, y) ? { x, y, id } : null;
  };
  const coordinates = (tileOrId) => {
    if (typeof tileOrId === 'string') return parseTileId(tileOrId);
    if (tileOrId && Number.isInteger(tileOrId.x) && Number.isInteger(tileOrId.y) && inBounds(tileOrId.x, tileOrId.y)) {
      return { x: tileOrId.x, y: tileOrId.y, id: tileId(tileOrId.x, tileOrId.y) };
    }
    return null;
  };
  const neighbours = (tileOrId) => {
    const origin = coordinates(tileOrId);
    if (!origin) return [];
    return MAP_DIRECTIONS
      .map(({ id, dx, dy }) => {
        const x = origin.x + dx;
        const y = origin.y + dy;
        return inBounds(x, y) ? { id: tileId(x, y), x, y, direction: id } : null;
      })
      .filter(Boolean);
  };
  const areAdjacent = (a, b) => {
    const first = coordinates(a);
    const second = coordinates(b);
    if (!first || !second) return false;
    const dx = Math.abs(first.x - second.x);
    const dy = Math.abs(first.y - second.y);
    return dx <= 1 && dy <= 1 && (dx + dy) > 0;
  };
  const distance = (a, b) => {
    const first = coordinates(a);
    const second = coordinates(b);
    if (!first || !second) return Infinity;
    return Math.max(Math.abs(first.x - second.x), Math.abs(first.y - second.y));
  };
  const distanceBetweenPositions = (a, b) => {
    if (!Number.isFinite(a?.x) || !Number.isFinite(a?.y) || !Number.isFinite(b?.x) || !Number.isFinite(b?.y)) return Infinity;
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  };
  const direction = (from, to) => {
    const first = coordinates(from);
    const second = coordinates(to);
    if (!first || !second || (first.x === second.x && first.y === second.y)) return null;
    return directionFromDelta(Math.sign(second.x - first.x), Math.sign(second.y - first.y));
  };
  const directionFromDelta = (dx, dy) => MAP_DIRECTIONS.find((entry) => entry.dx === Math.sign(dx) && entry.dy === Math.sign(dy))?.id ?? null;
  const directionIndex = (value) => {
    if (typeof value === 'number') return Number.isInteger(value) && value >= 0 && value < MAP_DIRECTIONS.length ? value : -1;
    return MAP_DIRECTIONS.findIndex((entry) => entry.id === value);
  };
  const directionChange = (from, to) => {
    const first = directionIndex(from);
    const second = directionIndex(to);
    if (first < 0 || second < 0) return 0;
    const difference = Math.abs(first - second);
    return Math.min(difference, MAP_DIRECTIONS.length - difference);
  };
  const radius = (center, range) => {
    const origin = coordinates(center);
    if (!origin || !Number.isInteger(range) || range < 0) return [];
    const result = [];
    for (let y = Math.max(0, origin.y - range); y <= Math.min(height - 1, origin.y + range); y += 1) {
      for (let x = Math.max(0, origin.x - range); x <= Math.min(width - 1, origin.x + range); x += 1) {
        if (Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y)) <= range) result.push({ id: tileId(x, y), x, y });
      }
    }
    return result;
  };
  const line = (from, to) => {
    const first = coordinates(from);
    const second = coordinates(to);
    if (!first || !second) return [];
    const result = [];
    let x = first.x;
    let y = first.y;
    const dx = Math.abs(second.x - first.x);
    const dy = Math.abs(second.y - first.y);
    const sx = first.x < second.x ? 1 : -1;
    const sy = first.y < second.y ? 1 : -1;
    let error = dx - dy;
    while (true) {
      result.push({ id: tileId(x, y), x, y });
      if (x === second.x && y === second.y) break;
      const doubled = 2 * error;
      if (doubled > -dy) { error -= dy; x += sx; }
      if (doubled < dx) { error += dx; y += sy; }
    }
    return result;
  };
  const tilesBetween = (from, to) => {
    const result = line(from, to);
    return result.length > 2 ? result.slice(1, -1) : [];
  };

  return Object.freeze({
    width,
    height,
    size: width * height,
    inBounds,
    tileId,
    parseTileId,
    coordinates,
    neighbours,
    areAdjacent,
    distance,
    distanceBetweenPositions,
    direction,
    directionFromDelta,
    directionIndex,
    directionChange,
    radius,
    line,
    tilesBetween,
  });
}
