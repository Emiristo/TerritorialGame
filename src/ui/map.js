export function renderMap(container, state) {
  container.replaceChildren();
  container.style.setProperty('--map-columns', '12');

  for (const tile of state.tiles) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tile${tile.id === state.selectedTileId ? ' is-selected' : ''}${tile.ownerId ? ' is-owned' : ''}`;
    button.dataset.tileId = tile.id;
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `Клетка ${tile.id}`);
    button.textContent = tile.ownerId ? '●' : '';
    container.append(button);
  }
}
