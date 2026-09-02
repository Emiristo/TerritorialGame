import { createGameState, getSelectedTile } from './game/state.js';
import { renderMap } from './ui/map.js';
import { renderBuildMenu, renderPlayerPanel, renderTilePanel, renderTurnInfo } from './ui/panels.js';
import { BUILDING_TYPES, addBuilding, canBuildOnTile, createBuilding } from './game/buildings.js';
import { deliverConstructionMaterial } from './game/materials.js';
import { advanceConstruction, startConstruction } from './game/construction.js';
import { startGameClock, tickGameClock } from './game/clock.js';
import { processWorkersTurn } from './game/workers.js';

const state = createGameState();
const elements = { map: document.querySelector('#map'), playerPanel: document.querySelector('#player-panel'), buildMenu: document.querySelector('#build-menu-panel'), tilePanel: document.querySelector('#tile-panel'), turnInfo: document.querySelector('#turn-info'), status: document.querySelector('#status'), endTurn: document.querySelector('#end-turn') };
if (Object.values(elements).some((element) => !element)) throw new Error('Игровой интерфейс не найден: проверьте index.html.');
let selectedBuildingTypeId = null;
let previewTileId = null;
function findBuildingType(typeId) { return Object.values(BUILDING_TYPES).find((type) => type.id === typeId) ?? null; }
function clearBuildSelection() { selectedBuildingTypeId = null; previewTileId = null; }
function selectMapTile(tileId) { state.selectedTileId = tileId; previewTileId = selectedBuildingTypeId ? tileId : null; }
function render() { renderMap(elements.map, state, selectedBuildingTypeId, previewTileId); renderPlayerPanel(elements.playerPanel, state); renderBuildMenu(elements.buildMenu, state, selectedBuildingTypeId); renderTilePanel(elements.tilePanel, state, selectedBuildingTypeId); renderTurnInfo(elements.turnInfo, state); }

elements.map.addEventListener('pointerover', (event) => { if (!selectedBuildingTypeId) return; const tile = event.target.closest('[data-tile-id]'); if (!tile) return; previewTileId = tile.dataset.tileId; render(); });
elements.map.addEventListener('click', (event) => { const tile = event.target.closest('[data-tile-id]'); if (!tile) return; selectMapTile(tile.dataset.tileId); elements.status.textContent = selectedBuildingTypeId ? 'Место выбрано. Проверьте предпросмотр и подтвердите строительство.' : `Выбрана клетка ${state.selectedTileId}.`; render(); });
elements.buildMenu.addEventListener('click', (event) => { const action = event.target.closest('[data-action="select-building"]'); if (!action) return; const type = findBuildingType(action.dataset.typeId); if (!type) return; selectedBuildingTypeId = type.id; previewTileId = state.selectedTileId; elements.status.textContent = `Выбрано здание: ${type.name}. Наведите на карту для предпросмотра.`; render(); });

elements.tilePanel.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action="build"]');
  if (!action || !selectedBuildingTypeId) return;
  const tile = getSelectedTile(state); const type = findBuildingType(selectedBuildingTypeId);
  if (!tile || !type) return;
  if (!canBuildOnTile(state, type.id, tile.id)) { elements.status.textContent = 'Здесь нельзя построить это здание.'; return; }
  const building = createBuilding(`building-${state.buildings.length + 1}`, state.player.id, type.id, tile.id);
  addBuilding(state, building); startConstruction(state, building);
  elements.status.textContent = `Место строительства подготовлено: ${type.name}. Ожидание строительных материалов.`;
  clearBuildSelection(); render();
});

elements.endTurn.addEventListener('click', () => { const results = processWorkersTurn(state); const extracted = results.reduce((sum, result) => sum + result.amount, 0); state.selectedTileId = null; clearBuildSelection(); elements.status.textContent = extracted > 0 ? `Ход завершён. Добыто ресурсов: ${extracted}.` : 'Ход завершён. Работники без добычи.'; render(); });

startGameClock(state.clock);
setInterval(() => {
  const elapsedSeconds = tickGameClock(state.clock);
  const completed = [];
  for (const building of state.buildings) {
    const wasComplete = building.constructionComplete;
    advanceConstruction(state, building, elapsedSeconds);
    if (!wasComplete && building.constructionComplete) completed.push(building);
  }
  if (completed.length) elements.status.textContent = `Строительство завершено: ${completed.map((building) => findBuildingType(building.typeId)?.name ?? building.typeId).join(', ')}.`;
  render();
}, 1000);

// Temporary delivery hook for the current testing stage. Real carriers and routes will replace this later.
window.deliverConstructionMaterial = (buildingId, resourceId, amount = 1) => {
  const delivered = deliverConstructionMaterial(state, buildingId, resourceId, amount);
  if (delivered) {
    const building = state.buildings.find((item) => item.id === buildingId);
    advanceConstruction(state, building, 0);
    render();
  }
  return delivered;
};

render();
