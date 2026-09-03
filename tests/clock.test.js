import { describe, expect, it } from 'vitest';
import { createGameClock, startGameClock, pauseGameClock, setGameSpeed, tickGameClock } from '../src/game/clock.js';

describe('simulation tick clock', () => {
  it('starts at zero simulation ticks', () => {
    const clock = createGameClock(1000);
    expect(clock.simulationTicks).toBe(0);
    expect(clock.elapsedSeconds).toBe(0);
    expect(clock.realTimeAccumulator).toBe(0);
  });

  it('produces whole simulation ticks and keeps the fractional remainder', () => {
    const clock = createGameClock(1000);
    startGameClock(clock, 1000);
    expect(tickGameClock(clock, 3500)).toBe(2);
    expect(clock.simulationTicks).toBe(2);
    expect(clock.elapsedSeconds).toBe(2);
    expect(clock.realTimeAccumulator).toBe(0.5);
  });

  it('does not advance the simulation before one full game second', () => {
    const clock = createGameClock(1000);
    startGameClock(clock, 1000);
    expect(tickGameClock(clock, 1500)).toBe(0);
    expect(clock.simulationTicks).toBe(0);
    expect(clock.elapsedSeconds).toBe(0);
    expect(clock.realTimeAccumulator).toBe(0.5);
  });

  it('advances game time twice as fast at x2', () => {
    const clock = createGameClock(1000);
    startGameClock(clock, 1000);
    setGameSpeed(clock, 2, 1000);
    expect(tickGameClock(clock, 3500)).toBe(5);
    expect(clock.simulationTicks).toBe(5);
    expect(clock.elapsedSeconds).toBe(5);
  });

  it('advances game time three times as fast at x3', () => {
    const clock = createGameClock(1000);
    startGameClock(clock, 1000);
    setGameSpeed(clock, 3, 1000);
    expect(tickGameClock(clock, 3000)).toBe(6);
    expect(clock.simulationTicks).toBe(6);
    expect(clock.elapsedSeconds).toBe(6);
  });

  it('changes speed without creating a time jump', () => {
    const clock = createGameClock(1000);
    startGameClock(clock, 1000);
    expect(tickGameClock(clock, 3000)).toBe(2);
    setGameSpeed(clock, 3, 3000);
    expect(clock.elapsedSeconds).toBe(2);
    expect(tickGameClock(clock, 4000)).toBe(3);
    expect(clock.elapsedSeconds).toBe(5);
  });

  it('stops advancing while paused', () => {
    const clock = createGameClock(1000);
    startGameClock(clock, 1000);
    pauseGameClock(clock, 3000);
    expect(clock.elapsedSeconds).toBe(2);
    expect(clock.simulationTicks).toBe(2);
    expect(tickGameClock(clock, 10000)).toBe(0);
    expect(clock.elapsedSeconds).toBe(2);
  });

  it('rejects unsupported speeds', () => {
    const clock = createGameClock();
    expect(() => setGameSpeed(clock, 4)).toThrow();
  });
});
