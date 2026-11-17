// Taishan's island, in numbers only. `world/taishan.js` builds it and
// `world/layout.js` hands the same profile to the engine's walk grid, so a click on
// the boards or on the sand routes there like any other floor. No imports here:
// layout is imported by the engine's blocks, and a cycle would be fatal.

export const ISLE = { x: 6.5, z: 58, r: 15.5 };                       // the sandbank
export const PLINTH = { x: 6.5, z: 58.6, w: 13, h: 1.6, d: 12 };       // the statue's base
// The boards sit 0.55 m over the shore, which is under the walkers' 0.6 m step:
// at 0.62 the click-to-walk grid refused to step up onto them.
export const WALK = { x: 6.5, half: 1.7, z0: 30.2, z1: 43.4, y: .55 }; // the boardwalk
export const PLATEAU = 1.8;                                            // its flat top
export const BANDS = 6, RISE = .28;
export const BAND = (ISLE.r - 8) / BANDS;
export const bandTop = k => .12 + k * RISE;        // k = 0 is the outermost, wettest ring
export const bandOf = d => Math.max(0, Math.min(BANDS - 1, Math.floor((ISLE.r - d) / BAND)));

export function isleHeight(distance) {
  if (distance > ISLE.r) return null;
  return distance <= 8 ? PLATEAU : bandTop(bandOf(distance));
}

// The walkable surface at a point: the boards if they are underfoot, else the bank.
// Null everywhere else, so the caller keeps whatever it had.
export function surfaceAt(x, z) {
  if (Math.abs(x - WALK.x) <= WALK.half && z >= WALK.z0 && z <= WALK.z1) return WALK.y;
  const y = isleHeight(Math.hypot(x - ISLE.x, z - ISLE.z));
  return y === null ? null : y;
}

// Where a ray first meets the boards or the bank. The engine asks every surface it
// can stand on to answer a click; without this the island is invisible to the
// pointer and clicking the sand does nothing at all. Walked in quarter metres, then
// bisected — the sand is stepped, so any crossing point on it will do.
export function pickSurface(o, d, max = 220) {
  let prevT = -1;
  for (let t = 0; t <= max; t += .25) {
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    const h = surfaceAt(x, z);
    if (h === null) { prevT = -1; continue; }
    if (y <= h) {
      let lo = prevT < 0 ? t : prevT, hi = t;
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        const my = o.y + d.y * mid;
        const mh = surfaceAt(o.x + d.x * mid, o.z + d.z * mid);
        if (mh !== null && my <= mh) hi = mid; else lo = mid;
      }
      const point = { x: o.x + d.x * hi, y: surfaceAt(o.x + d.x * hi, o.z + d.z * hi), z: o.z + d.z * hi };
      return { t: hi, point };
    }
    prevT = t;
  }
  return null;
}
