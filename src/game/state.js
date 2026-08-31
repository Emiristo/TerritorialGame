export const MAP_WIDTH = 12;
export const MAP_HEIGHT = 8;

export function createGameState() {
  const tiles = [];

  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      tiles.push({
        id: `${x}-${y}`,
        x,
        y,
        terrain: 'plains',
        ownerId: null,
        influence: {},
        resources: {
          wood: 0,
          stone: 0,
          ore: 0,
        },
      });
    }
  }

  // Один стартовый центр игрока. Баланс и правила владения будут добавлены отдельно.
  const capital = tiles.find((tile) => tile.x === 5 && tile.y === 4);
  if (capital) {
    capital.ownerId = 'player';
    capital.influence.player = 1;
  }

  return {
    turn: 1,
    selectedTileId: null,
    player: {
      id: 'player',
      name: 'Игрок',
      resources: {
        wood: 0,
        stone: 0,
        ore: 0,
        food: 0,
      },
    },
    tiles,
  };
}

export function getSelectedTile(state) {
  return state.tiles.find((tile) => tile.id === state.selectedTileId) ?? null;
}
