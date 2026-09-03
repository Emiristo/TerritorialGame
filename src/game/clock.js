export const GAME_SPEEDS = Object.freeze([1, 2, 3]);

export function createGameClock(now = Date.now()) {
  return {
    running: false,
    startedAt: null,
    lastUpdateAt: now,
    elapsedSeconds: 0,
    simulationTicks: 0,
    realTimeAccumulator: 0,
    speed: 1,
  };
}

export function startGameClock(clock, now = Date.now()) {
  if (clock.running) return clock;
  clock.running = true;
  clock.startedAt = now;
  clock.lastUpdateAt = now;
  return clock;
}

export function pauseGameClock(clock, now = Date.now()) {
  if (!clock.running) return clock;
  advanceGameClock(clock, now);
  clock.running = false;
  clock.lastUpdateAt = now;
  return clock;
}

export function setGameSpeed(clock, speed, now = Date.now()) {
  const nextSpeed = Number(speed);
  if (!GAME_SPEEDS.includes(nextSpeed)) throw new Error(`Unsupported game speed: ${speed}`);
  if (clock.running) advanceGameClock(clock, now);
  clock.speed = nextSpeed;
  clock.lastUpdateAt = now;
  return clock;
}

export function advanceGameClock(clock, now = Date.now()) {
  if (!clock.running) return 0;
  const realElapsed = Math.max(0, (now - clock.lastUpdateAt) / 1000);
  clock.realTimeAccumulator += realElapsed * clock.speed;
  clock.lastUpdateAt = now;

  const ticks = Math.floor(clock.realTimeAccumulator);
  if (ticks <= 0) return 0;

  clock.realTimeAccumulator -= ticks;
  clock.simulationTicks += ticks;
  clock.elapsedSeconds = clock.simulationTicks;
  return ticks;
}

export function tickGameClock(clock, now = Date.now()) {
  return advanceGameClock(clock, now);
}
