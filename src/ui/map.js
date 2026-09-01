import { MAP_WIDTH } from '../game/state.js';
import { TERRAIN_BY_ID } from '../game/terrain.js';
import { getTerritorySourceAtTile } from '../game/territory.js';
import { BUILDING_TYPES, getBuildingAtTile, getFootprintTiles, getReservedTiles, canBuildOnTile } from '../game/buildings.js';

const TERRAIN_SYMBOLS = { plains: '·', forest: '♣', mountains: '▲', hills: '◆', water: '~' };
const BUILDING_SYMBOLS = { headquarters: '🏛️', warehouse: '📦', forester_hut: '🌲', stonecutter_hut: '🪨', sawmill: '🪚', well: '💧', farm: '🌾', mill: '⚙️', bakery: '🥖', coal_mine: '⛏️', iron_mine: '⛏️', gold_mine: '🟡', marble_mine: '🪨', foundry: '🔥', forge: '⚒️', workshop: '🛠️', mint: '🪙', outpost: '🏕️', barracks: '🏰', watchtower: '🗼', fortress: '🏯' };

export function getBuildingPreview(state, typeId, originTileId) {
  if (!typeId || !originTileId) return { footprint: [], reserved: [], valid: false };
  const footprint = getFootprintTiles(state, typeId, originTileId);
  const reserved = getReservedTiles(state, typeId, originTileId);
  return { footprint, reserved, valid: canBuildOnTile(state, typeId, originTileId) };
}

export function renderMap(container, state, selectedBuildingTypeId = null, previewTileId = null) {
  container.replaceChildren();
  container.style.setProperty('--map-columns', String(MAP_WIDTH));

  const preview = getBuildingPreview(state, selectedBuildingTypeId, previewTileId);
  const footprintIds = new Set(preview.footprint.map((tile) => tile.id));
  const reservedIds = new Set(preview.reserved.map((tile) => tile.id));

  for (const tile of state.tiles) {
    const terrain = TERRAIN_BY_ID[tile.terrain];
    const source = getTerritorySourceAtTile(state, tile.id);
    const building = getBuildingAtTile(state, tile.id);
    const ownerClass = tile.ownerId ? `owner-${tile.ownerId}` : 'owner-neutral';
    const previewClass = footprintIds.has(tile.id)
      ? `preview-footprint preview-${preview.valid ? 'valid' : 'invalid'}`
      : reservedIds.has(tile.id) ? 'preview-reserved' : '';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = ['tile', `terrain-${tile.terrain}`, ownerClass,
      tile.id === state.selectedTileId ? 'is-selected' : '',
      source ? 'is-territory-source' : '',
      building ? 'is-building' : '',
      previewClass].filter(Boolean).join(' ');
    button.dataset.tileId = tile.id;
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `${terrain?.name ?? tile.terrain}, клетка ${tile.id}`);
    button.title = building
      ? `${BUILDING_SYMBOLS[building.typeId] ?? '⌂'} ${building.typeId} · ${tile.x}, ${tile.y}`
      : `${terrain?.name ?? tile.terrain} · ${tile.x}, ${tile.y}`;
    button.textContent = building
      ? (BUILDING_SYMBOLS[building.typeId] ?? '⌂')
      : (source ? `◆${TERRAIN_SYMBOLS[tile.terrain] ?? ''}` : (TERRAIN_SYMBOLS[tile.terrain] ?? ''));
    container.append(button);
  }
}
