import process from 'node:process'

/**
 * The shell flag that lets a screenshot run honour the simulated clock.
 *
 * The default is deliberately the REAL clock, and that default is load-bearing. The local
 * stack's tournament_time_controls row sits at 2028-06-14, which is AFTER the prediction
 * lock, and .env.local turns time travel on — so a harness that simply inherited the
 * environment photographed a LOCKED board every time: nothing picked, no champion named,
 * no slot "Selected to advance". Four defects the owner found on a handset lived in states
 * the harness could not reach, because it was never looking at the page the owner sees.
 *
 * So: pre-lock by default, still. But the denial used to be hardcoded, which meant a stage
 * that genuinely wants a tournament-phase screenshot had to boot its own dev server (as the
 * Bracket Health timing harness did). Opting in is now a shell variable rather than a fork
 * of the harness — and because it must be asked for explicitly, no run drifts into simulated
 * time by accident.
 */
export const VISUAL_TIME_TRAVEL_ENV = 'VISUAL_ENABLE_TIME_TRAVEL'

/** The value to hand the child Vite process as VITE_ENABLE_TIME_TRAVEL. */
export function resolveVisualTimeTravel(env = process.env) {
  return env[VISUAL_TIME_TRAVEL_ENV] === 'true' ? 'true' : 'false'
}

/** True when this run has opted in, for harnesses that want to say so in their log. */
export function visualTimeTravelEnabled(env = process.env) {
  return resolveVisualTimeTravel(env) === 'true'
}
