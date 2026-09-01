export function createGameClock(now = Date.now()) {
  return { running: false, startedAt: null, lastUpdateAt: now, elapsedSeconds: 0 };
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

export function advanceGameClock(clock, now = Date.now()) {
  if (!clock.running) return 0;
  const elapsed = Math.max(0, (now - clock.lastUpdateAt) / 1000);
  clock.elapsedSeconds += elapsed;
  clock.lastUpdateAt = now;
  return elapsed;
}
