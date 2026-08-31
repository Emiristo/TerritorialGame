import { getSelectedTile } from '../game/state.js';

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

  container.innerHTML = `
    <div class="stat"><span>Координаты</span><strong>${tile.x}, ${tile.y}</strong></div>
    <div class="stat"><span>Ландшафт</span><strong>${tile.terrain}</strong></div>
    <div class="stat"><span>Владелец</span><strong>${tile.ownerId ?? 'нет'}</strong></div>
  `;
}

export function renderTurnInfo(container, state) {
  container.textContent = `Ход: ${state.turn}`;
}
