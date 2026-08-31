import { TERRAIN_BY_ID } from '../game/terrain.js';

const TERRAIN_SYMBOLS = {
  plains: '·',
  forest: '♣',
  mountains: '▲',
  hills: '◆',
  water: '~',
};

export function renderMap(container, state) {
  container.replaceChildren();
  container.style.setProperty('--map-columns', '12');

  for (const tile of state.tiles) {
    const terrain = TERRAIN_BY_ID[tile.terrain];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tile terrain-${tile.terrain}${tile.id === state.selectedTileId ? ' is-selected' : ''}${tile.ownerId ? ' is-owned' : ''}`;
    button.dataset.tileId = tile.id;
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `${terrain?.name ?? tile.terrain}, клетка ${tile.id}`);
    button.title = `${terrain?.name ?? tile.terrain} · ${tile.x}, ${tile.y}`;
    button.textContent = tile.ownerId ? `●${TERRAIN_SYMBOLS[tile.terrain] ?? ''}` : (TERRAIN_SYMBOLS[tile.terrain] ?? '');
    container.append(button);
  }
}
