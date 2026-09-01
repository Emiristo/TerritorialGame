import { MAP_WIDTH } from '../game/state.js';
import { TERRAIN_BY_ID } from '../game/terrain.js';
import { getTerritorySourceAtTile } from '../game/territory.js';
import { getBuildingAtTile } from '../game/buildings.js';

const TERRAIN_SYMBOLS = { plains: '·', forest: '♣', mountains: '▲', hills: '◆', water: '~' };
const BUILDING_SYMBOLS = { lumber_camp: '🪚', quarry: '🪨', mine: '⛏️' };

export function renderMap(container, state) {
  container.replaceChildren();
  container.style.setProperty('--map-columns', String(MAP_WIDTH));
  for (const tile of state.tiles) {
    const terrain = TERRAIN_BY_ID[tile.terrain];
    const source = getTerritorySourceAtTile(state, tile.id);
    const building = getBuildingAtTile(state, tile.id);
    const ownerClass = tile.ownerId ? `owner-${tile.ownerId}` : 'owner-neutral';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = ['tile', `terrain-${tile.terrain}`, ownerClass, tile.id === state.selectedTileId ? 'is-selected' : '', source ? 'is-territory-source' : '', building ? 'is-building' : ''].filter(Boolean).join(' ');
    button.dataset.tileId = tile.id;
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `${terrain?.name ?? tile.terrain}, клетка ${tile.id}, владелец: ${tile.ownerId ?? 'нет'}`);
    button.title = building ? `${building.typeId} · ${tile.x}, ${tile.y}` : `${terrain?.name ?? tile.terrain} · ${tile.x}, ${tile.y} · влияние игрока: ${tile.influence.player ?? 0}`;
    button.textContent = building ? (BUILDING_SYMBOLS[building.typeId] ?? '⌂') : (source ? `◆${TERRAIN_SYMBOLS[tile.terrain] ?? ''}` : (TERRAIN_SYMBOLS[tile.terrain] ?? ''));
    container.append(button);
  }
}
