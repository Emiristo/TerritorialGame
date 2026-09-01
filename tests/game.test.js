describe('workers and work zones', () => {
  it('keeps work zones at radius five by default', () => { expect(createWorkZone('zone-1', 'player', '0-0').radius).toBe(5); expect(INFLUENCE_RADIUS).toBe(5); expect(isWithinInfluenceRadius({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(true); expect(isWithinInfluenceRadius({ x: 0, y: 0 }, { x: 6, y: 0 })).toBe(false); });
  it('does not assign an incompatible worker to the headquarters', () => { const state = createGameState(); const worker = createWorker('worker-1', 'player', WORKER_TYPES.LUMBERJACK.id); state.workers.push(worker); expect(() => assignWorkerToBuilding(state, worker.id, state.buildings[0].id)).toThrow(); });
});

describe('building placement', () => {
  it('validates the complete footprint', () => { const state = createGameState(); const plain = state.tiles.find((tile) => tile.terrain === 'plains' && tile.ownerId === 'player' && tile.x > 35 && tile.x < 45 && tile.y > 35 && tile.y < 45); expect(plain).toBeDefined(); expect(getFootprintTiles(state, BUILDING_TYPES.WAREHOUSE.id, plain.id)).toHaveLength(9); });
  it('allows a regular building on owned plains and rejects forest', () => { const state = createGameState(); const plain = state.tiles.find((tile) => tile.terrain === 'plains' && tile.x > 35 && tile.x < 45 && tile.y > 35 && tile.y < 45); const forest = state.tiles.find((tile) => tile.terrain === 'forest'); expect(plain).toBeDefined(); for (const tile of getFootprintTiles(state, BUILDING_TYPES.WAREHOUSE.id, plain.id)) tile.ownerId = 'player'; expect(canBuildOnTile(state, BUILDING_TYPES.WAREHOUSE.id, plain.id)).toBe(true); expect(canBuildOnTile(state, BUILDING_TYPES.WAREHOUSE.id, forest.id)).toBe(false); });
  it('allows a mine on owned hills', () => { const state = createGameState(); const hill = state.tiles.find((tile) => tile.terrain === 'hills' && tile.x >= 43 && tile.x <= 44 && tile.y >= 54 && tile.y <= 55); expect(hill).toBeDefined(); for (const tile of getFootprintTiles(state, BUILDING_TYPES.IRON_MINE.id, hill.id)) tile.ownerId = 'player'; expect(canBuildOnTile(state, BUILDING_TYPES.IRON_MINE.id, hill.id)).toBe(true); });
});

describe('territories', () => {
  it('supports a custom source radius', () => { const source = createTerritorySource('test', 'player', '50-50', 1, 10); expect(source.radius).toBe(10); });
  it('expands territory from a source', () => { const state = createGameState(); const before = getOwnedTiles(state, 'player').length; addTerritorySource(state, createTerritorySource('extra', 'player', '80-80', 1, 5)); expect(getOwnedTiles(state, 'player').length).toBeGreaterThan(before); });
});
