import { createGameState, getSelectedTile } from './game/state.js';
import { renderMap } from './ui/map.js';
import { renderBuildMenu, renderPlayerPanel, renderTilePanel, renderTurnInfo } from './ui/panels.js';
import { BUILDING_TYPES, addBuilding, canBuildOnTile, createBuilding } from './game/buildings.js';
import { advanceConstruction, startConstruction } from './game/construction.js';
import { startGameClock } from './game/clock.js';
import { processWorkersTurn } from './game/workers.js';

const state = createGameState();
const elements = { map: document.querySelector('#map'), playerPanel: document.querySelector('#player-panel'), buildMenu: document.querySelector('#build-menu-panel'), tilePanel: document.querySelector('#tile-panel'), turnInfo: document.querySelector('#turn-info'), status: document.querySelector('#status'), endTurn: document.querySelector('#end-turn') };
if (Object.values(elements).some((element) => !element)) throw new Error('Игровой интерфейс не найден: проверьте index.html.');
function render() { renderMap(elements.map, state); renderPlayerPanel(elements.playerPanel, state); renderBuildMenu(elements.buildMenu, state, selectedBuildingTypeId); renderTilePanel(elements.tilePanel, state); renderTurnInfo(elements.turnInfo, state); }
function canAfford(cost) { return Object.entries(cost).every(([resource, amount]) => (state.player.resources[resource] ?? 0) >= amount); }
function pay(cost) { for (const [resource, amount] of Object.entries(cost)) state.player.resources[resource] = (state.player.resources[resource] ?? 0) - amount; }
let selectedBuildingTypeId = null;

elements.map.addEventListener('click', (event) => { const tile = event.target.closest('[data-tile-id]'); if (!tile) return; state.selectedTileId = tile.dataset.tileId; elements.status.textContent = selectedBuildingTypeId ? `Выбрана клетка ${state.selectedTileId}.` : `Выбрана клетка ${state.selectedTileId}.`; render(); });
elements.buildMenu.addEventListener('click', (event) => { const action = event.target.closest('[data-action="select-building"]'); if (!action) return; const typeId = action.dataset.typeId; const type = Object.values(BUILDING_TYPES).find((item) => item.id === typeId); if (!type || !canAfford(type.cost)) { elements.status.textContent = 'Недостаточно ресурсов для строительства.'; return; } selectedBuildingTypeId = typeId; elements.status.textContent = `Выбрано здание: ${type.name}. Выберите клетку на карте.`; render(); });
elements.tilePanel.addEventListener('click', (event) => { const action = event.target.closest('[data-action]'); if (!action || action.dataset.action !== 'build') return; const tile = getSelectedTile(state); const typeId = selectedBuildingTypeId; if (!tile || !typeId) return; const type = Object.values(BUILDING_TYPES).find((item) => item.id === typeId); if (!type || !canAfford(type.cost)) { elements.status.textContent = 'Недостаточно ресурсов для строительства.'; return; } if (!canBuildOnTile(state, typeId, tile.id)) { elements.status.textContent = 'Здесь нельзя построить это здание.'; return; } pay(type.cost); const building = createBuilding(`building-${state.buildings.length + 1}`, state.player.id, typeId, tile.id); addBuilding(state, building); startConstruction(state, building); elements.status.textContent = building.constructionComplete ? `Построено: ${type.name}.` : `Строительство начато: ${type.name}. Время: ${building.constructionTime} с.`; selectedBuildingTypeId = null; render(); });
elements.endTurn.addEventListener('click', () => { const results = processWorkersTurn(state); const extracted = results.reduce((sum, result) => sum + result.amount, 0); state.selectedTileId = null; elements.status.textContent = extracted > 0 ? `Ход завершён. Добыто ресурсов: ${extracted}.` : 'Ход завершён. Работники без добычи.'; render(); });
startGameClock(state.clock);
setInterval(() => { const completed = advanceConstruction(state); if (completed.length) elements.status.textContent = `Строительство завершено: ${completed.map((building) => Object.values(BUILDING_TYPES).find((type) => type.id === building.typeId)?.name ?? building.typeId).join(', ')}.`; render(); }, 1000);
render();
