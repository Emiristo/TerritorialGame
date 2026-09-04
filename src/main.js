import { createGameState, getSelectedTile } from './game/state.js';
import { renderMap } from './ui/map.js';
import { renderBuildMenu, renderPlayerPanel, renderTilePanel, renderClockInfo } from './ui/panels.js';
import { BUILDING_TYPES, addBuilding } from './game/buildings.js';
import { syncBuildingFlags } from './game/buildingLogistics.js';
import { addStandaloneFlag } from './game/flags.js';
import { advanceAllConstructions, startConstruction } from './game/construction.js';
import { advanceGameClock, GAME_SPEEDS, pauseGameClock, setGameSpeed, startGameClock } from './game/clock.js';
import { buildRoadToNearestFlag } from './game/roads.js';
import { processLogisticsTasks } from './game/logisticsManager.js';

const state = createGameState();
const elements = { map: document.querySelector('#map'), playerPanel: document.querySelector('#player-panel'), buildMenu: document.querySelector('#build-menu-panel'), tilePanel: document.querySelector('#tile-panel'), clockInfo: document.querySelector('#clock-info'), status: document.querySelector('#status') };
if (Object.values(elements).some((element) => !element)) throw new Error('Игровой интерфейс не найден: проверьте index.html.');
let selectedBuildingTypeId = null;
let previewTileId = null;
let lastRenderedClockSeconds = -1;
function findBuildingType(typeId) { return Object.values(BUILDING_TYPES).find((type) => type.id === typeId) ?? null; }
function clearBuildSelection() { selectedBuildingTypeId = null; previewTileId = null; }
function selectMapTile(tileId) { state.selectedTileId = tileId; state.selectedFlagId = null; previewTileId = selectedBuildingTypeId ? tileId : null; }
function render() { syncBuildingFlags(state); renderMap(elements.map, state, selectedBuildingTypeId, previewTileId); renderPlayerPanel(elements.playerPanel, state); renderBuildMenu(elements.buildMenu, state, selectedBuildingTypeId); renderTilePanel(elements.tilePanel, state, selectedBuildingTypeId); renderClockInfo(elements.clockInfo, state); lastRenderedClockSeconds = state.clock.elapsedSeconds; }
elements.map.addEventListener('pointerover', (event) => { if (!selectedBuildingTypeId) return; const tile = event.target.closest('[data-tile-id]'); if (!tile) return; previewTileId = tile.dataset.tileId; render(); });
elements.map.addEventListener('click', (event) => { const flag = event.target.closest('[data-flag-id]'); if (flag) { state.selectedFlagId = flag.dataset.flagId; state.selectedTileId = null; clearBuildSelection(); elements.status.textContent = `Выбран флаг: ${state.selectedFlagId}.`; render(); return; } const tile = event.target.closest('[data-tile-id]'); if (!tile) return; selectMapTile(tile.dataset.tileId); elements.status.textContent = selectedBuildingTypeId ? 'Место выбрано. Проверьте предпросмотр и подтвердите строительство.' : `Выбрана клетка ${state.selectedTileId}.`; render(); });
elements.buildMenu.addEventListener('click', (event) => { const action = event.target.closest('[data-action="select-building"]'); if (!action) return; const type = findBuildingType(action.dataset.typeId); if (!type) return; state.selectedFlagId = null; selectedBuildingTypeId = type.id; previewTileId = state.selectedTileId; elements.status.textContent = `Выбрано здание: ${type.name}. Наведите на карту для предпросмотра.`; render(); });
elements.tilePanel.addEventListener('click', (event) => {
  const flagAction = event.target.closest('[data-action="place-flag"]');
  if (flagAction) { const tile = getSelectedTile(state); if (!tile) return; const x = tile.x + 0.5, y = tile.y + 1; try { const flag = addStandaloneFlag(state, `flag-${state.flags.length + 1}`, state.player.id, x, y); state.selectedFlagId = flag.id; state.selectedTileId = null; clearBuildSelection(); elements.status.textContent = 'Самостоятельный флаг установлен. Теперь его можно соединить дорогой.'; } catch (error) { elements.status.textContent = error instanceof Error ? error.message : 'Не удалось поставить флаг.'; } render(); return; }
  const roadAction = event.target.closest('[data-action="build-road"]');
  if (roadAction && state.selectedFlagId) { try { const road = buildRoadToNearestFlag(state, state.selectedFlagId, `road-${state.roads.length + 1}`); elements.status.textContent = road ? `Дорога построена до флага ${road.endFlagId}.` : 'Подходящий маршрут для дороги не найден.'; } catch (error) { elements.status.textContent = error instanceof Error ? error.message : 'Не удалось построить дорогу.' } render(); return; }
  const action = event.target.closest('[data-action="build"]'); if (!action || !selectedBuildingTypeId) return; const tile = getSelectedTile(state), type = findBuildingType(selectedBuildingTypeId); if (!tile || !type) return; try { const building = addBuilding(state, `building-${state.buildings.length + 1}`, state.player.id, type.id, tile.id); startConstruction(state, building); elements.status.textContent = `Место строительства подготовлено: ${type.name}. Ожидание строительных материалов.`; clearBuildSelection(); } catch (error) { elements.status.textContent = error instanceof Error ? error.message : 'Здесь нельзя построить это здание.'; } render(); });
elements.clockInfo.addEventListener('click', (event) => { const speedButton = event.target.closest('[data-speed]'); if (speedButton) { const speed = Number(speedButton.dataset.speed); if (!GAME_SPEEDS.includes(speed)) return; setGameSpeed(state.clock, speed); if (!state.clock.running) startGameClock(state.clock); elements.status.textContent = `Скорость игры: ×${speed}.`; render(); return; } const pauseButton = event.target.closest('[data-action="pause-game"]'); if (!pauseButton) return; if (state.clock.running) { pauseGameClock(state.clock); elements.status.textContent = 'Игра поставлена на паузу.'; } else { startGameClock(state.clock); elements.status.textContent = `Игра продолжена: ×${state.clock.speed}.`; } render(); });
startGameClock(state.clock);
setInterval(() => {
  const simulationTicks = advanceGameClock(state.clock);
  for (let tick = 0; tick < simulationTicks; tick += 1) {
    processLogisticsTasks(state);
    advanceAllConstructions(state, 1);
  }
  if (simulationTicks > 0 || Math.floor(state.clock.elapsedSeconds) !== Math.floor(lastRenderedClockSeconds)) render();
}, 100);
render();
