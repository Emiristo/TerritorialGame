import { getSelectedTile } from '../game/state.js';
import { TERRAIN_BY_ID } from '../game/terrain.js';

export function renderPlayerPanel(container, state) {
  const { resources } = state.player;
  container.innerHTML = `
    <div class="stat"><span>Дерево</span><strong>${resources.wood}</strong></div>
    <div class="stat"><span>Камень</span><strong>${resources.stone}</strong></div>
    <div class="stat"><span>Руда</span><strong>${resources.ore}</strong></div>
    <div class="stat"><span>Еда</span><strong>${resources.food}</strong></div>
  `;
}

export function renderTilePanel(container, state) {
  const tile = getSelectedTile(state);
  if (!tile) {
    container.textContent = 'Выберите клетку.';
    return;
  }

  const terrain = TERRAIN_BY_ID[tile.terrain];
  const resourceLines = Object.entries(tile.resources)
    .filter(([, amount]) => amount > 0)
    .map(([resource, amount]) => `${resource}: ${amount}`)
    .join(', ');
  const influenceLines = Object.entries(tile.influence)
    .map(([actor, amount]) => `${actor}: ${amount}`)
    .join(', ') || 'нет';

  container.innerHTML = `
    <div class="stat"><span>Координаты</span><strong>${tile.x}, ${tile.y}</strong></div>
    <div class="stat"><span>Ландшафт</span><strong>${terrain?.name ?? tile.terrain}</strong></div>
    <div class="stat"><span>Владелец</span><strong>${tile.ownerId ?? 'нет'}</strong></div>
    <div class="stat"><span>Ресурсы</span><strong>${resourceLines || 'нет'}</strong></div>
    <div class="stat"><span>Влияние</span><strong>${influenceLines}</strong></div>
  `;
}

export function renderTurnInfo(container, state) {
  container.textContent = `Ход: ${state.turn} · Радиус влияния/рабочей зоны: ${state.rules.influenceRadius}`;
}
