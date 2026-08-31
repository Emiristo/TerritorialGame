import { TERRAIN_BY_ID } from '../game/terrain.js';
import { getTerritorySourceAtTile } from '../game/territory.js';

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
    const source = getTerritorySourceAtTile(state, tile.id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = [
      'tile',
      `terrain-${tile.terrain}`,
      tile.ownerId ? `owner-${tile.ownerId}` : '',
      tile.id === state.selectedTileId ? 'is-selected' : '',
      source ? 'is-territory-source' : '',
    ].filter(Boolean).join(' ');
    button.dataset.tileId = tile.id;
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `${terrain?.name ?? tile.terrain}, клетка ${tile.id}, владелец: ${tile.ownerId ?? 'нет'}`);
    button.title = `${terrain?.name ?? tile.terrain} · ${tile.x}, ${tile.y} · влияние: ${tile.influence.player ?? 0}`;
    button.textContent = source ? `◆${TERRAIN_SYMBOLS[tile.terrain] ?? ''}` : (TERRAIN_SYMBOLS[tile.terrain] ?? '');
    container.append(button);
  }
}
