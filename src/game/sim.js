// Pure, deterministic game logic (no three.js, no DOM). Fixed time-step so every
// level can be proven winnable by a bot (see scripts/verify-levels.mjs).
//
// RULES  (N = correct verifications = flap budget)
//  - You own exactly N flaps ("moves"). Every flap spends one.
//  - The street holds N-1 gates, then the EXIT pad. Rest of the ground is a death trap.
//  - You may reach the exit on ANY flap <= N. Wasting none is not required.
//  - Out of flaps = you glide down: you win only if you land on the exit pad.

export const DT = 1 / 120;          // fixed step (s)
export const SPEED = 4.2;           // world units / s
export const GRAVITY = 21;          // units / s^2
export const FLAP_V = 8.6;          // upward velocity set by one flap
export const FLOOR = 0;             // top of the ground
export const CEIL = 12.2;
export const BIRD_R = 0.42;
export const BIRD_X0 = 0;           // bird world-x at t=0 (world scrolls past it)
export const GAP = 5.2;             // gap height of a gate
export const PIPE_W = 1.3;
export const PAD_HALF = 3.4;        // half-width of exit pad
export const START_Y = 5.4;
export const LEAD = 6.5;            // distance before first gate

// Small seeded RNG so a given N always yields a nice-but-varied level per seed.
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Step the bird kinematics by one DT. Returns new {y,vy}. */
export function stepBird(y, vy) {
  vy -= GRAVITY * DT;
  y += vy * DT;
  return { y, vy };
}

/**
 * Build a level that is solvable by construction: we first plan the "ideal run"
 * (one flap per hop), then drop gates onto that trajectory.
 * moves = N. Gates = N-1. The N-th hop lands on the exit pad.
 */
export function buildLevel(moves, seed = 1) {
  const R = rng(seed * 7919 + moves * 104729);
  const gates = [];
  let t = 0.0;               // time of the flap
  let y = START_Y;           // y at flap time
  let x = BIRD_X0;
  const flapPlan = [];
  const lo = 3.6, hi = 8.6;  // comfortable altitude band for gate centres

  for (let k = 0; k < moves; k++) {
    flapPlan.push(t);
    const last = k === moves - 1;
    // choose where this hop should end (y at next flap time, or ground for last)
    const target = last ? FLOOR + BIRD_R : lo + R() * (hi - lo);
    const dy = target - y;
    // y(T) = FLAP_V*T - g/2 T^2 = dy  -> take the descending (larger) root
    const disc = FLAP_V * FLAP_V - 2 * GRAVITY * dy;
    let T = (FLAP_V + Math.sqrt(Math.max(0, disc))) / GRAVITY;
    if (!last) T = Math.min(1.12, Math.max(0.72, T));
    const yEnd = y + FLAP_V * T - 0.5 * GRAVITY * T * T;
    // gate sits at ~56% of the hop so the player has to flap *before* it
    if (!last) {
      const tg = 0.56 * T;
      const gy = y + FLAP_V * tg - 0.5 * GRAVITY * tg * tg;
      const gx = LEAD + SPEED * (t + tg);
      gates.push({
        i: k,
        x: gx,
        cy: Math.min(hi + 0.6, Math.max(lo - 0.4, gy)),
        gap: GAP,
        passed: false,
        coinTaken: false,
      });
    }
    t += T;
    y = last ? FLOOR + BIRD_R : yEnd;
    x = LEAD + SPEED * t;
  }
  const padX = LEAD + SPEED * t;       // x where the ideal landing happens
  const length = padX + PAD_HALF + 5;
  return { moves, seed, gates, padX, length, flapPlan, idealTime: t };
}

export class Sim {
  constructor(moves, seed = 1) {
    this.level = buildLevel(moves, seed);
    this.moves = moves;
    this.reset();
  }
  reset() {
    this.t = 0;
    this.x = BIRD_X0 + LEAD * 0; // bird's world x; level coords are absolute x
    this.x = 0;
    this.y = START_Y;
    this.vy = 0;
    this.flapsLeft = this.moves;
    this.flapsUsed = 0;
    this.status = 'ready';      // ready | playing | won | lost
    this.cause = null;          // pipe | ceiling | trap | landed-short
    this.passed = 0;
    this.coins = 0;
    this.score = 0;
    this.events = [];           // consumed by renderer/audio each frame
    this.acc = 0;
    this.level.gates.forEach(g => { g.passed = false; g.coinTaken = false; });
    this.tilt = 0;
  }
  /** Player pressed flap. */
  flap() {
    if (this.status === 'ready') { this.status = 'playing'; this.events.push({ type: 'start' }); }
    if (this.status !== 'playing') return false;
    if (this.flapsLeft <= 0) { this.events.push({ type: 'empty' }); return false; }
    this.flapsLeft--; this.flapsUsed++;
    this.vy = FLAP_V;
    this.events.push({ type: 'flap', left: this.flapsLeft });
    return true;
  }
  /** Advance by real dt seconds (accumulated into fixed steps). */
  advance(dt) {
    if (this.status === 'ready') { this.hover += dt; return; }
    if (this.status !== 'playing') return;
    this.acc += Math.min(dt, 0.05);
    while (this.acc >= DT && this.status === 'playing') { this.acc -= DT; this.tick(); }
  }
  tick() {
    this.t += DT;
    this.x += SPEED * DT;
    const b = stepBird(this.y, this.vy);
    this.y = b.y; this.vy = b.vy;
    this.tilt += ((Math.max(-1, Math.min(1, this.vy / 10))) - this.tilt) * 0.15;
    const bx = this.x + LEAD; // absolute level x of the bird
    const L = this.level;

    if (this.y > CEIL) { this.y = CEIL; if (this.vy > 0) this.vy = 0; }

    for (const g of L.gates) {
      const l = g.x - PIPE_W / 2 - BIRD_R * 0.8, r = g.x + PIPE_W / 2 + BIRD_R * 0.8;
      if (bx > l && bx < r) {
        const top = g.cy + g.gap / 2 - BIRD_R * 0.85;
        const bot = g.cy - g.gap / 2 + BIRD_R * 0.85;
        if (this.y > top || this.y < bot) return this.lose('pipe');
      }
      if (!g.passed && bx > g.x + PIPE_W / 2) {
        g.passed = true; this.passed++;
        this.events.push({ type: 'gate', i: g.i });
      }
      if (!g.coinTaken && Math.abs(bx - g.x) < 0.7 && Math.abs(this.y - g.cy) < 0.95) {
        g.coinTaken = true; this.coins++;
        this.events.push({ type: 'coin', i: g.i });
      }
    }
    // ground
    if (this.y - BIRD_R <= FLOOR) {
      this.y = FLOOR + BIRD_R;
      const onPad = Math.abs(bx - L.padX) <= PAD_HALF;
      if (onPad && this.passed >= L.gates.length) return this.win();
      return this.lose(onPad ? 'gates' : 'trap');
    }
    // bird sailed past the pad while still airborne -> it will land beyond: death trap
  }
  win() {
    this.status = 'won'; this.cause = null;
    this.score = this.passed * 100 + this.coins * 50 + 500 + this.flapsLeft * 75;
    this.events.push({ type: 'win' });
  }
  lose(cause) {
    this.status = 'lost'; this.cause = cause;
    this.score = this.passed * 100 + this.coins * 50;
    this.events.push({ type: 'lose', cause });
  }
  /** absolute level-space x of the bird */
  get bx() { return this.x + LEAD; }
}
Sim.prototype.hover = 0;
