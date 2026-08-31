import { createGameState, getSelectedTile } from './game/state.js';
import { addTerritorySource, createTerritorySource, getTerritorySourceAtTile } from './game/territory.js';
import { renderMap } from './ui/map.js';
import { renderPlayerPanel, renderTilePanel, renderTurnInfo } from './ui/panels.js';

const state = createGameState();
const elements = {
  map: document.querySelector('#map'), playerPanel: document.querySelector('#player-panel'),
  tilePanel: document.querySelector('#tile-panel'), turnInfo: document.querySelector('#turn-info'),
  status: document.querySelector('#status'), endTurn: document.querySelector('#end-turn'),
};

function render() {
  renderMap(elements.map, state);
  renderPlayerPanel(elements.playerPanel, state);
  renderTilePanel(elements.tilePanel, state);
  renderTurnInfo(elements.turnInfo, state);
}

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
  if (!tile || tile.ownerId !== state.player.id) return;
  if (getTerritorySourceAtTile(state, tile.id)) return;

  const id = `outpost-${state.territorySources.length + 1}`;
  addTerritorySource(state, createTerritorySource(id, state.player.id, tile.id, 1));
  elements.status.textContent = `Новый источник влияния размещён на ${tile.id}.`;
  render();
});

elements.endTurn.addEventListener('click', () => {
  state.turn += 1;
  state.selectedTileId = null;
  elements.status.textContent = `Начат ход ${state.turn}.`;
  render();
});

render();
