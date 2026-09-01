import { getSelectedTile } from '../game/state.js';
import { TERRAIN_BY_ID } from '../game/terrain.js';
import { getTerritorySourceAtTile } from '../game/territory.js';
import { getBuildingAtTile } from '../game/buildings.js';

const BUILDING_NAMES = { lumber_camp: 'Лесопилка', quarry: 'Каменоломня', mine: 'Шахта' };
const WORKER_NAMES = { lumberjack: 'Лесоруб', stonemason: 'Каменщик', miner: 'Шахтёр' };

export function renderPlayerPanel(container, state) {
  const { resources } = state.player;
  const ownedTiles = state.tiles.filter((tile) => tile.ownerId === state.player.id).length;
  const sources = (state.territorySources ?? []).filter((source) => source.ownerId === state.player.id && source.active).length;
  const buildings = (state.buildings ?? []).filter((building) => building.ownerId === state.player.id && building.active).length;
  const workers = (state.workers ?? []).filter((worker) => worker.ownerId === state.player.id).length;
  container.innerHTML = `<div class="stat"><span>Территория</span><strong>${ownedTiles}</strong></div><div class="stat"><span>Здания</span><strong>${buildings}</strong></div><div class="stat"><span>Рабочие</span><strong>${workers}</strong></div><div class="stat"><span>Источники влияния</span><strong>${sources}</strong></div><div class="stat"><span>Дерево</span><strong>${resources.wood}</strong></div><div class="stat"><span>Камень</span><strong>${resources.stone}</strong></div><div class="stat"><span>Руда</span><strong>${resources.ore}</strong></div><div class="stat"><span>Еда</span><strong>${resources.food}</strong></div>`;
}

export function renderTilePanel(container, state) {
  const tile = getSelectedTile(state);
  if (!tile) { container.textContent = 'Выберите клетку.'; return; }
  const terrain = TERRAIN_BY_ID[tile.terrain];
  const source = getTerritorySourceAtTile(state, tile.id);
  const building = getBuildingAtTile(state, tile.id);
  const workers = building ? (state.workers ?? []).filter((worker) => worker.buildingId === building.id) : [];
  const zone = building ? state.workZones?.find((item) => item.buildingId === building.id) : null;
  const resourceLines = Object.entries(tile.resources).filter(([, amount]) => amount > 0).map(([resource, amount]) => `${resource}: ${amount}`).join(', ');
  const influenceLines = Object.entries(tile.influence).map(([actor, amount]) => `${actor}: ${amount}`).join(', ') || 'нет';
  const canBuildSource = tile.ownerId === state.player.id && !source;
  container.innerHTML = `<div class="stat"><span>Координаты</span><strong>${tile.x}, ${tile.y}</strong></div><div class="stat"><span>Ландшафт</span><strong>${terrain?.name ?? tile.terrain}</strong></div><div class="stat"><span>Владелец</span><strong>${tile.ownerId ?? 'нет'}</strong></div><div class="stat"><span>Ресурсы</span><strong>${resourceLines || 'нет'}</strong></div><div class="stat"><span>Влияние</span><strong>${influenceLines}</strong></div><div class="stat"><span>Источник</span><strong>${source?.id ?? 'нет'}</strong></div>${building ? `<div class="stat"><span>Здание</span><strong>${BUILDING_NAMES[building.typeId] ?? building.typeId}</strong></div><div class="stat"><span>Рабочая зона</span><strong>R=${zone?.radius ?? 5}</strong></div><div class="stat"><span>Работники</span><strong>${workers.map((worker) => WORKER_NAMES[worker.typeId] ?? worker.typeId).join(', ') || 'нет'}</strong></div>` : ''}${canBuildSource ? '<button class="panel-action" type="button" data-action="build-source">Разместить источник влияния</button>' : ''}`;
}

export function renderTurnInfo(container, state) {
  container.textContent = `Ход: ${state.turn} · Радиус влияния/рабочей зоны: ${state.rules.influenceRadius}`;
}
