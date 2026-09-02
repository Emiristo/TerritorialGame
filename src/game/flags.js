export function createFlag(id, buildingId, ownerId, x, y) {
  return {
    id,
    buildingId,
    ownerId,
    x,
    y,
    roadIds: [],
    connected: false,
  };
}

export function getFlagAtTile(state, tileId) {
  return (state.flags ?? []).find((flag) => `${flag.x}-${flag.y}` === tileId) ?? null;
}

export function getFlagForBuilding(state, buildingId) {
  return (state.flags ?? []).find((flag) => flag.buildingId === buildingId) ?? null;
}

export function addFlag(state, flag) {
  state.flags ??= [];
  if (state.flags.some((item) => item.id === flag.id)) throw new Error(`Flag already exists: ${flag.id}`);
  state.flags.push(flag);
  return flag;
}

export function removeFlag(state, flagId) {
  const index = (state.flags ?? []).findIndex((flag) => flag.id === flagId);
  if (index < 0) return null;
  const [removed] = state.flags.splice(index, 1);
  return removed;
}
