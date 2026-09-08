export function buildLogisticsPlanner(state) {
  const buildings = state.buildings ?? [];
  const active = buildings.filter((building) => building.active);

  const byId = new Map(active.map((building) => [building.id, building]));
  const flags = new Map((state.flags ?? []).map((flag) => [flag.id, flag]));

  return { active, byId, flags };
}
