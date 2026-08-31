import { getSelectedTile } from '../game/state.js';
import { TERRAIN_BY_ID } from '../game/terrain.js';
import { getTerritorySourceAtTile } from '../game/territory.js';

export function renderPlayerPanel(container, state) {
  const { resources } = state.player;
  const ownedTiles = state.tiles.filter((tile) => tile.ownerId === state.player.id).length;
  const sources = (state.territorySources ?? []).filter((source) => source.ownerId === state.player.id && source.active).length;
  container.innerHTML = `<div class="stat"><span>Территория</span><strong>${ownedTiles}</strong></div><div class="stat"><span>Источники влияния</span><strong>${sources}</strong></div><div class="stat"><span>Дерево</span><strong>${resources.wood}</strong></div><div class="stat"><span>Камень</span><strong>${resources.stone}</strong></div><div class="stat"><span>Руда</span><strong>${resources.ore}</strong></div><div class="stat"><span>Еда</span><strong>${resources.food}</strong></div>`;
}

export function renderTilePanel(container, state) {
  const tile = getSelectedTile(state);
  if (!tile) { container.textContent = 'Выберите клетку.'; return; }
  const terrain = TERRAIN_BY_ID[tile.terrain];
  const source = getTerritorySourceAtTile(state, tile.id);
  const resourceLines = Object.entries(tile.resources).filter(([, amount]) => amount > 0).map(([resource, amount]) => `${resource}: ${amount}`).join(', ');
  const influenceLines = Object.entries(tile.influence).map(([actor, amount]) => `${actor}: ${amount}`).join(', ') || 'нет';
  const canBuildSource = tile.ownerId === state.player.id && !source;
  container.innerHTML = `<div class="stat"><span>Координаты</span><strong>${tile.x}, ${tile.y}</strong></div><div class="stat"><span>Ландшафт</span><strong>${terrain?.name ?? tile.terrain}</strong></div><div class="stat"><span>Владелец</span><strong>${tile.ownerId ?? 'нет'}</strong></div><div class="stat"><span>Ресурсы</span><strong>${resourceLines || 'нет'}</strong></div><div class="stat"><span>Влияние</span><strong>${influenceLines}</strong></div><div class="stat"><span>Источник</span><strong>${source?.id ?? 'нет'}</strong></div>${canBuildSource ? '<button class="panel-action" type="button" data-action="build-source">Разместить источник влияния</button>' : ''}`;
}

export function renderTurnInfo(container, state) {
  container.textContent = `Ход: ${state.turn} · Радиус влияния/рабочей зоны: ${state.rules.influenceRadius}`;
}
