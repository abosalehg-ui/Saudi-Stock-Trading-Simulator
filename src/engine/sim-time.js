/**
 * Convert real elapsed time since a timestamp into "simulated" elapsed time,
 * scaled by the current game speed.
 *
 * Sim speed only accelerates price ticks in real terms (the interval between
 * ticks shrinks), while other time-based effects (news decay/expiry, scenario
 * duration) previously measured elapsed time against the real wall clock.
 * That meant a news item's impact, meant to spread over ~5 ticks, instead got
 * re-applied on every tick within the same real-time window — at 10x speed,
 * roughly 10x more ticks land in that window, so the impact front-loaded and
 * exhausted almost immediately instead of fading out over its nominal
 * duration. Scaling elapsed time by speed keeps ~1 tick worth of elapsed time
 * per tick regardless of speed, matching the original at-speed-1 assumption.
 *
 * Known limitation: if speed changes while an event is active, this
 * reinterprets the *entire* elapsed window at the new speed, not just the
 * time since the change (e.g. switching from 1x to 10x mid-event can cause a
 * sudden jump toward completion). Events here are short-lived (a handful of
 * minutes), so this is an acceptable simplification; a fully accurate fix
 * would track a persisted monotonic simulated clock instead of wall time.
 *
 * @param {number} sinceTimestamp - real Date.now() timestamp the event started
 * @param {number} speed - current gameState.speed multiplier
 * @returns {number} simulated elapsed milliseconds
 */
export function simElapsedMs(sinceTimestamp, speed) {
  return (Date.now() - sinceTimestamp) * speed;
}
