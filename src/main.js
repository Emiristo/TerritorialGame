import { createGameState, getSelectedTile } from './game/state.js';
import { addTerritorySource, createTerritorySource, getTerritorySourceAtTile } from './game/territory.js';
import { processWorkersTurn } from './game/workers.js';
import { renderMap } from './ui/map.js';
import { renderPlayerPanel, renderTilePanel, renderTurnInfo } from './ui/panels.js';

const state = createGameState();
const elements = { map: document.querySelector('#map'), playerPanel: document.querySelector('#player-panel'), tilePanel: document.querySelector('#tile-panel'), turnInfo: document.querySelector('#turn-info'), status: document.querySelector('#status'), endTurn: document.querySelector('#end-turn') };
if (Object.values(elements).some((element) => !element)) throw new Error('Игровой интерфейс не найден: проверьте index.html.');

function render() { renderMap(elements.map, state); renderPlayerPanel(elements.playerPanel, state); renderTilePanel(elements.tilePanel, state); renderTurnInfo(elements.turnInfo, state); }

elements.map.addEventListener('click', (event) => {
  const tile = event.target.closest('[data-tile-id]');
  if (!tile) return;
  state.selectedTileId = tile.dataset.tileId;
  elements.status.textContent = `Выбрана клетка ${state.selectedTileId}.`;
  render();
});

elements.tilePanel.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action="build-source"]');
  if (!action) return;
  const tile = getSelectedTile(state);
  if (!tile || tile.ownerId !== state.player.id || getTerritorySourceAtTile(state, tile.id)) return;
  const id = `outpost-${state.territorySources.length + 1}`;
  addTerritorySource(state, createTerritorySource(id, state.player.id, tile.id, 1));
  elements.status.textContent = `Новый источник влияния размещён на ${tile.id}.`;
  render();
});

elements.endTurn.addEventListener('click', () => {
  const results = processWorkersTurn(state);
  const extracted = results.reduce((sum, result) => sum + result.amount, 0);
  state.selectedTileId = null;
  elements.status.textContent = extracted > 0 ? `Ход завершён. Добыто ресурсов: ${extracted}.` : 'Ход завершён. Работники без добычи.';
  render();
});

render();
