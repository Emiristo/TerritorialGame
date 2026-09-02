import { createGameState, getSelectedTile } from './game/state.js';
import { renderMap } from './ui/map.js';
import { renderBuildMenu, renderPlayerPanel, renderTilePanel, renderClockInfo } from './ui/panels.js';
import { BUILDING_TYPES, addBuilding, canBuildOnTile, createBuilding } from './game/buildings.js';
import { deliverConstructionMaterial } from './game/materials.js';
import { advanceAllConstructions, advanceConstruction, startConstruction } from './game/construction.js';
import { advanceGameClock, GAME_SPEEDS, pauseGameClock, setGameSpeed, startGameClock } from './game/clock.js';

const state = createGameState();
const elements = {
  map: document.querySelector('#map'),
  playerPanel: document.querySelector('#player-panel'),
  buildMenu: document.querySelector('#build-menu-panel'),
  tilePanel: document.querySelector('#tile-panel'),
  clockInfo: document.querySelector('#clock-info'),
  status: document.querySelector('#status'),
};
if (Object.values(elements).some((element) => !element)) throw new Error('Игровой интерфейс не найден: проверьте index.html.');

let selectedBuildingTypeId = null;
let previewTileId = null;
let lastRenderedClockSeconds = -1;

function findBuildingType(typeId) { return Object.values(BUILDING_TYPES).find((type) => type.id === typeId) ?? null; }
function clearBuildSelection() { selectedBuildingTypeId = null; previewTileId = null; }
function selectMapTile(tileId) { state.selectedTileId = tileId; previewTileId = selectedBuildingTypeId ? tileId : null; }
function render() {
  renderMap(elements.map, state, selectedBuildingTypeId, previewTileId);
  renderPlayerPanel(elements.playerPanel, state);
  renderBuildMenu(elements.buildMenu, state, selectedBuildingTypeId);
  renderTilePanel(elements.tilePanel, state, selectedBuildingTypeId);
  renderClockInfo(elements.clockInfo, state);
  lastRenderedClockSeconds = state.clock.elapsedSeconds;
}

elements.map.addEventListener('pointerover', (event) => {
  if (!selectedBuildingTypeId) return;
  const tile = event.target.closest('[data-tile-id]');
  if (!tile) return;
  previewTileId = tile.dataset.tileId;
  render();
});

elements.map.addEventListener('click', (event) => {
  const tile = event.target.closest('[data-tile-id]');
  if (!tile) return;
  selectMapTile(tile.dataset.tileId);
  elements.status.textContent = selectedBuildingTypeId
    ? 'Место выбрано. Проверьте предпросмотр и подтвердите строительство.'
    : `Выбрана клетка ${state.selectedTileId}.`;
  render();
});

elements.buildMenu.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action="select-building"]');
  if (!action) return;
  const type = findBuildingType(action.dataset.typeId);
  if (!type) return;
  selectedBuildingTypeId = type.id;
  previewTileId = state.selectedTileId;
  elements.status.textContent = `Выбрано здание: ${type.name}. Наведите на карту для предпросмотра.`;
  render();
});

elements.tilePanel.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action="build"]');
  if (!action || !selectedBuildingTypeId) return;
  const tile = getSelectedTile(state);
  const type = findBuildingType(selectedBuildingTypeId);
  if (!tile || !type) return;
  if (!canBuildOnTile(state, type.id, tile.id)) {
    elements.status.textContent = 'Здесь нельзя построить это здание.';
    return;
  }
  const building = createBuilding(`building-${state.buildings.length + 1}`, state.player.id, type.id, tile.id);
  addBuilding(state, building);
  startConstruction(state, building);
  elements.status.textContent = `Место строительства подготовлено: ${type.name}. Ожидание строительных материалов.`;
  clearBuildSelection();
  render();
});

elements.clockInfo.addEventListener('click', (event) => {
  const speedButton = event.target.closest('[data-speed]');
  if (speedButton) {
    const speed = Number(speedButton.dataset.speed);
    if (!GAME_SPEEDS.includes(speed)) return;
    setGameSpeed(state.clock, speed);
    if (!state.clock.running) startGameClock(state.clock);
    elements.status.textContent = `Скорость игры: ×${speed}.`;
    render();
    return;
  }
  const pauseButton = event.target.closest('[data-action="pause-game"]');
  if (!pauseButton) return;
  if (state.clock.running) {
    pauseGameClock(state.clock);
    elements.status.textContent = 'Игра поставлена на паузу.';
  } else {
    startGameClock(state.clock);
    elements.status.textContent = `Игра продолжена: ×${state.clock.speed}.`;
  }
  render();
});

startGameClock(state.clock);

setInterval(() => {
  const elapsedSeconds = advanceGameClock(state.clock);
  if (elapsedSeconds > 0) advanceAllConstructions(state, elapsedSeconds);
  if (elapsedSeconds > 0 || Math.floor(state.clock.elapsedSeconds) !== Math.floor(lastRenderedClockSeconds)) render();
}, 100);

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
