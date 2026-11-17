// Taishan's island: a sandbank off the front door, reached by a boardwalk, with a
// statue of the poodle on it — taller than the house, because his name is Tai Shan.
//
// The island, the boardwalk and the base are blocks, like the rest of the world.
// The statue is not: it is one merged mesh of rounded primitives — balls for the
// body and head, cones for the legs — because a poodle made of cubes read as a
// haystack. It stands 21 m, twice the house.
import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { canvasTexture } from '@engine/world/textures.js';
import { WALK, ISLE, PLATEAU, PLINTH, BANDS, BAND, bandTop, isleHeight, pickSurface } from './taishan-profile.js';

// ---------- Where it stands ----------
// The bank's shape and the base live in taishan-profile.js, because the walk grid
// and the map need them too.
// How much bigger than the study model the statue is: 1.5 puts it at 21 m, twice
// the height of the house.
const SCALE = 1.5;
// The nameplate beside the base: foot on the sand, plate turned to the north.
const SIGN = { x: 13.9, z: 56.2, y: PLATEAU };   // foot on the sand

// ---------- Palette ----------
const paint = tint => ({ tex: 'paint', tint });
const fur = tint => ({ tex: 'concrete', tint });
const APRICOT = 0xcf9660, APRICOT_LIGHT = 0xe3b183, APRICOT_DARK = 0xb87d4c;
const CREAM = 0xf3ead9, WHITE = 0xf7f4ec, PINK = 0xefc0c9, CHARCOAL = 0x2b2b31, BLACK = 0x121215;
const SAND = 0xd8c9a8, SAND_DARK = 0xbca987, STONE = 0xc7c0b0, WOOD = 0x9a7048, GLOW = 0xffd79a;

// ---------- The same dog, in curls ----------
// Rounded primitives merged into one mesh: balls for the coat, cones for the
// skirt and legs. The counterpart of the block dog above, for comparison.
function smoothed() {
  const position = [], normal = [], color = [], shade = new THREE.Color();
  const add = (geometry, matrix, hex) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    g.applyMatrix4(matrix);
    const p = g.attributes.position, n = g.attributes.normal;
    shade.set(hex);
    for (let i = 0; i < p.count; i++) {
      position.push(p.getX(i), p.getY(i), p.getZ(i));
      normal.push(n.getX(i), n.getY(i), n.getZ(i));
      color.push(shade.r, shade.g, shade.b);
    }
    if (g !== geometry) g.dispose();
    geometry.dispose();
  };
  const at = (x, y, z, sx, sy, sz) => new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
  return {
    ball: (r, x, y, z, hex, sx = 1, sy = 1, sz = 1) => add(new THREE.SphereGeometry(1, 12, 9), at(x, y, z, r * sx, r * sy, r * sz), hex),
    cone: (top, bottom, h, x, y, z, hex) => add(new THREE.CylinderGeometry(top, bottom, h, 20, 1), at(x, y, z, 1, 1, 1), hex),
    build: () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
      g.computeBoundingSphere();
      return g;
    },
  };
}

function placeCurls(root, x, z, scale = 1, base = 0) {
  const g = smoothed();

  // The same anatomy as the block dog, so the only difference is the surface.
  g.ball(2.95, 0, 3.4, 1.4, APRICOT, 1, 1.15, .98);
  g.ball(2.6, 0, 6.6, -.8, APRICOT, 1, 1.19, .88);
  for (const s of [-1, 1]) {
    g.cone(.85, .9, 6.1, s * 1.55, 3.05, -1.15, APRICOT);
    g.ball(1.05, s * 1.55, .5, -1.3, CREAM, 1, .62, 1.1);
    g.ball(1.1, s * 1.95, .45, 2.9, CREAM, 1, .55, 1.2);
  }
  g.ball(1.15, 0, 4.6, 4.1, APRICOT);
  g.ball(.7, .25, 5.5, 4.3, APRICOT_LIGHT);

  g.ball(2.65, 0, 10.4, -1.1, APRICOT);
  // Ears hang down the sides of the head, long and a little flat, the way a
  // poodle's do.
  for (const s of [-1, 1]) g.ball(1.15, s * 2.45, 8.7, -.9, APRICOT, .58, 2.25, .92);
  g.ball(1.4, 0, 9.75, -3.15, CREAM, 1, .82, .9);
  g.ball(.5, 0, 10.0, -4.35, BLACK);
  for (const s of [-1, 1]) {
    g.ball(.4, s * 1.05, 11.05, -3.35, BLACK);
    g.ball(.16, s * .95, 11.2, -3.6, WHITE);
  }

  const mesh = new THREE.Mesh(g.build(), new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.position.set(x, base, z);
  mesh.scale.setScalar(scale);
  mesh.name = 'taishan-statue';
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
}

// ---------- The island ----------
export function buildTaishan(layer, materials) {
  const root = new THREE.Group();
  root.name = 'taishan';
  const B = new BoxBatch(layer);

  // Sandbank as rows of blocks, one terrace per band, each slab's top exactly the
  // height `isleHeight` reports for that band.
  for (let k = 0; k < BANDS; k++) {
    const radius = ISLE.r - k * BAND;
    const top = bandTop(k);
    for (let z = -radius; z <= radius; z += 1.1) {
      const halfWidth = Math.sqrt(Math.max(0, radius * radius - z * z));
      if (halfWidth < .4) continue;
      const jitter = ((Math.round(z * 13) % 5) - 2) * .12;
      B.box(ISLE.x, top - 1.2, ISLE.z + z + .55, halfWidth * 2 + jitter, 1.2, 1.12,
        { tex: 'sand', tint: k > 3 ? SAND : SAND_DARK });
    }
  }
  // The plateau, one slab up from the last terrace.
  for (let z = -8; z <= 8; z += 1.1) {
    const halfWidth = Math.sqrt(Math.max(0, 64 - z * z));
    B.box(ISLE.x, PLATEAU - 1.2, ISLE.z + z + .55, halfWidth * 2, 1.2, 1.12, { tex: 'sand', tint: SAND });
  }
  // Stones around the edge, and a few tufts inland.
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2, r = ISLE.r - 1.2;
    const size = .7 + (i % 3) * .35;
    B.box(ISLE.x + Math.cos(a) * r, .18, ISLE.z + Math.sin(a) * r, size, size * .8, size * .85, { tex: 'stone', tint: STONE });
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + .4, r = 9 + (i % 4);
    B.box(ISLE.x + Math.cos(a) * r, .5, ISLE.z + Math.sin(a) * r, .22, .8, .22, { tex: 'hedge', tint: 0x9fae72 });
  }

  // The base: a low stone step above the sand, with a lighter coping on top. The
  // statue stands on the coping, so nothing is buried and nothing floats.
  B.box(PLINTH.x, PLATEAU - .9, PLINTH.z, PLINTH.w, 1.0, PLINTH.d, { tex: 'stone', tint: STONE });
  B.box(PLINTH.x, PLATEAU + .1, PLINTH.z, PLINTH.w + .5, .14, PLINTH.d + .5, { tex: 'stone', tint: 0xd6cfc1 });

  // The boardwalk: planks on posts, with a stanchion either side.
  for (let z = WALK.z0; z <= WALK.z1; z += .55) {
    B.box(WALK.x, WALK.y - .12, z, WALK.half * 2, .16, .5, { tex: 'deck', tint: Math.round(z * 3) % 2 ? 0xb98d5f : 0xa87e52 });
  }
  for (const s of [-1, 1]) {
    B.box(WALK.x + s * (WALK.half - .1), WALK.y - .3, (WALK.z0 + WALK.z1) / 2, .18, .18, WALK.z1 - WALK.z0, paint(0x7d5a3a));
    for (let z = WALK.z0 + .5; z < WALK.z1; z += 2.6) {
      B.box(WALK.x + s * (WALK.half - .1), -1.4, z, .22, WALK.y + 1.15, .22, paint(0x6f5136));
      B.box(WALK.x + s * (WALK.half - .32), WALK.y + .1, z, .16, .95, .16, paint(0xb9b1a1));
    }
  }

  // A lantern at the landing, and the signpost beside the base. Both use glow, so
  // the island is findable at night even though the baked lamp volume stops by the
  // pool. The sign stands on the sand (its foot at SIGN.y, the plateau's height),
  // and the plate faces north, towards whoever walks out along the boardwalk.
  B.box(WALK.x - 2.7, .5, WALK.z0 + 1.4, .22, 3, .22, paint(0x4a4a4e));
  B.box(WALK.x - 2.7, 3.4, WALK.z0 + 1.4, .5, .7, .5, { tex: 'glow', tint: GLOW, emissive: 1 });
  B.box(SIGN.x, SIGN.y, SIGN.z + .16, .24, 2.1, .24, { tex: 'wood_panel', tint: WOOD });   // post, behind
  B.box(SIGN.x, SIGN.y + 1.5, SIGN.z, 2.1, .95, .14, { tex: 'wood_panel', tint: WOOD });   // board

  // The dog goes into the batch before it is built into meshes.
  placeCurls(root, PLINTH.x, PLINTH.z, SCALE, PLATEAU + .24);

  // One line in the console, so "I cannot see it" can be answered with a fact:
  // either the island was built, or the console says why it was not.
  const blocks = Object.values(B.items).reduce((n, list) => n + list.length, 0);
  console.info(`Taishan: ${blocks} island blocks + 1 statue at (${PLINTH.x}, ${PLINTH.z}) ×${SCALE} — ${(PLATEAU + .24 + 13.05 * SCALE).toFixed(1)} m tall`);

  for (const mesh of B.build(materials)) root.add(mesh);

  // The name, drawn once onto a small plate.
  const plate = canvasTexture(256, 116, (ctx, w, h) => {
    ctx.fillStyle = '#f0e2c2'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3a2a18';
    ctx.font = '600 56px -apple-system, "PingFang SC", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('泰山', w / 2, h / 2 + 3);
  }, { pixelated: false });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.92, .86), new THREE.MeshLambertMaterial({ map: plate }));
  board.position.set(SIGN.x, SIGN.y + 1.98, SIGN.z - .08);
  board.rotation.y = Math.PI;                // the plate faces north
  root.add(board);

  // ---------- What the world walks on ----------
  // Unnamed on purpose. A named site (roof, pier, mountain) is somewhere the engine
  // travels to by its own rules; this is plain walkable ground, so clicking it should
  // use the ordinary route — which it can now do, because the walk grid covers the
  // bank and the boards (see NAV_AREA in layout.js).
  function levels(x, z, out) {
    if (Math.abs(x - WALK.x) <= WALK.half && z >= WALK.z0 && z <= WALK.z1) out.push({ y: WALK.y });
    const y = isleHeight(Math.hypot(x - ISLE.x, z - ISLE.z));
    if (y !== null) out.push({ y });
  }
  const heightAt = (x, z) => {
    const y = isleHeight(Math.hypot(x - ISLE.x, z - ISLE.z));
    return y === null ? -Infinity : y;
  };
  const obstructed = (x, z) => Math.abs(x - PLINTH.x) <= PLINTH.w / 2 && Math.abs(z - PLINTH.z) <= PLINTH.d / 2;
  const spots = () => [{ x: WALK.x, z: WALK.z0 + 1 }, { x: WALK.x, z: ISLE.z - 8 }];

  // The walk grid knows nothing about `obstructed`, so the base also goes in as an
  // obstacle: without it a route to the sand behind the statue would run through it.
  const obstacles = [{ x0: PLINTH.x - PLINTH.w / 2, x1: PLINTH.x + PLINTH.w / 2, z0: PLINTH.z - PLINTH.d / 2, z1: PLINTH.z + PLINTH.d / 2, level: 0 }];

  // The island is not blocks, so it has to answer the pointer itself: this is what
  // turns a click on the sand into a walk there.
  const pick = ray => pickSurface(ray.origin, ray.direction);

  return { group: root, levels, heightAt, obstructed, obstacles, spots, pick };
}
