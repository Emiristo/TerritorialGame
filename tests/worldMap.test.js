import { describe, expect, it } from 'vitest';
import { createMapGeometry } from '../src/game/world/mapGeometry.js';
import { createWorldMap, getWorldTile, getWorldTileById } from '../src/game/world/worldMap.js';
import { createGameState } from '../src/game/state.js';

describe('WorldMap foundation', () => {
  it('creates worlds of arbitrary dimensions', () => {
    const map = createWorldMap(7, 5);
    expect(map.width).toBe(7);
    expect(map.height).toBe(5);
    expect(map.size).toBe(35);
    expect(map.tiles).toHaveLength(35);
    expect(getWorldTile(map, 6, 4).id).toBe('6-4');
    expect(getWorldTile(map, 7, 4)).toBeNull();
  });

  it('keeps tile lookup inside the map geometry', () => {
    const map = createWorldMap(10, 8);
    expect(getWorldTileById(map, '3-6')).toMatchObject({ id: '3-6', x: 3, y: 6 });
    expect(getWorldTileById(map, '10-6')).toBeNull();
    expect(getWorldTileById(map, 'bad-id')).toBeNull();
  });

  it('attaches a variable-size WorldMap to the game state', () => {
    const state = createGameState(Date.now(), 120, 110);
    expect(state.worldMap.width).toBe(120);
    expect(state.worldMap.height).toBe(110);
    expect(state.tiles).toBe(state.worldMap.tiles);
    expect(state.tiles).toHaveLength(120 * 110);
  });
});

describe('MapGeometry', () => {
  it('provides one source of truth for dimensions and coordinates', () => {
    const geometry = createMapGeometry(4, 3);
    expect(geometry.size).toBe(12);
    expect(geometry.inBounds(3, 2)).toBe(true);
    expect(geometry.inBounds(4, 2)).toBe(false);
    expect(geometry.coordinates('2-1')).toEqual({ x: 2, y: 1, id: '2-1' });
    expect(geometry.tileId(2, 1)).toBe('2-1');
  });

  it('uses the current square-cell neighbour topology consistently', () => {
    const geometry = createMapGeometry(5, 5);
    expect(geometry.neighbours('2-2')).toHaveLength(8);
    expect(geometry.neighbours('0-0')).toHaveLength(3);
    expect(geometry.areAdjacent('2-2', '3-3')).toBe(true);
    expect(geometry.areAdjacent('2-2', '4-4')).toBe(false);
  });

  it('provides consistent distance and radius queries', () => {
    const geometry = createMapGeometry(10, 10);
    expect(geometry.distance('1-1', '4-5')).toBe(4);
    expect(geometry.radius('5-5', 1)).toHaveLength(9);
    expect(geometry.radius('0-0', 1)).toHaveLength(4);
  });

  it('provides canonical direction lookup', () => {
    const geometry = createMapGeometry(10, 10);
    expect(geometry.direction('2-2', '2-1')).toBe('north');
    expect(geometry.direction('2-2', '3-2')).toBe('east');
    expect(geometry.direction('2-2', '3-1')).toBe('northEast');
    expect(geometry.direction('2-2', '5-4')).toBe('southEast');
    expect(geometry.direction('2-2', '2-2')).toBeNull();
  });

  it('provides the road-compatible 8-direction turn rules', () => {
    const geometry = createMapGeometry(10, 10);
    expect(geometry.directionIndex('east')).toBe(0);
    expect(geometry.directionIndex('southEast')).toBe(1);
    expect(geometry.directionIndex('northEast')).toBe(7);
    expect(geometry.directionChange('east', 'southEast')).toBe(1);
    expect(geometry.directionChange('east', 'northEast')).toBe(1);
    expect(geometry.directionChange('east', 'south')).toBe(2);
    expect(geometry.directionChange('east', 'north')).toBe(2);
  });

  it('provides bounded straight-line queries', () => {
    const geometry = createMapGeometry(10, 10);
    expect(geometry.line('1-1', '4-4').map((tile) => tile.id)).toEqual(['1-1', '2-2', '3-3', '4-4']);
    expect(geometry.tilesBetween('1-1', '4-4').map((tile) => tile.id)).toEqual(['2-2', '3-3']);
    expect(geometry.tilesBetween('2-2', '3-3')).toEqual([]);
  });
});
