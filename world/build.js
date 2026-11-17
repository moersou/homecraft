// Build the Homecraft show-home example. The engine calls build() once at boot,
// then setup() once the player exists.
import { buildIsland } from '@engine/world/terrain.js';
import { buildForest } from '@engine/world/landscape.js';
import { defineHouseBlocks, surfaceAt, buildPool, buildShell } from './house.js';
import { furnish } from './furnish.js';
import { buildOuter } from './outer.js';
import { buildMountain } from './mountain.js';
import { buildRoofAccess } from './roof-access.js';
import { buildTaishan } from './taishan.js';
import { createStainless } from './stainless.js';
import { createVertec } from './vertec.js';
import { createTv } from './tv.js';
import { ISLAND, FOREST, HALL, STAGE, PIANO, INTRO } from './layout.js';

export function build({ grid, layer, materials, stage }) {
  // The kitchen's brushed steel is a real metal, with its own room reflection.
  materials.boxMetal = createStainless(stage);
  defineHouseBlocks(grid);
  buildIsland(grid, ISLAND, { surfaceAt });
  buildPool(grid);
  buildShell(grid);
  const forest = buildForest(grid, layer, FOREST);
  const furn = furnish({ layer });
  // The pier and sailboat, the mountain and the roof's outside stair are
  // ground of their own, outside the block grid.
  const outer = buildOuter(layer, materials), mountain = buildMountain(layer, materials), roofAccess = buildRoofAccess(layer, materials);
  // Taishan's island off the front door. It is the world's own furniture, so a
  // failure there must not keep the house shut: the reason goes to the console and
  // the island is simply absent.
  let taishan = null;
  try {
    taishan = buildTaishan(layer, materials);
    stage.scene.add(taishan.group);
  } catch (error) {
    console.error('Taishan island failed to build:', error);
  }
  stage.scene.add(outer.group, mountain.group, roofAccess.group);
  return {
    batches: furn.batches, planes: furn.planes, obstacles: furn.obstacles, lights: furn.lights, bakes: [...furn.lighting, ...outer.lamps, ...mountain.lamps],
    hotspots: furn.hotspots, animated: furn.animated, surfaces: furn.surfaces, forest,
    sites: [outer, mountain, ...(taishan ? [taishan] : [])], sitesAfter: [roofAccess],
    named: { outer, mountain, roofAccess, drawMap },
  };
}

// The music hall on the radar: its floor, the stage against the west wall and
// the grand piano standing on it.
function drawMap(ctx, X, Z, PPM) {
  ctx.fillStyle = '#3a2c1f';
  ctx.fillRect(X(HALL.x0), Z(HALL.z0), (HALL.x1 - HALL.x0) * PPM, (HALL.z1 - HALL.z0) * PPM);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(X(HALL.x0 + 0.3), Z(HALL.z0 + 0.3), (HALL.x1 - HALL.x0 - 0.6) * PPM, (HALL.z1 - HALL.z0 - 0.6) * PPM);
  ctx.fillStyle = '#26190f';
  ctx.fillRect(X(STAGE.x0), Z(STAGE.z0), (STAGE.x1 - STAGE.x0) * PPM, (STAGE.z1 - STAGE.z0) * PPM);
  // The piano, turned with the hall's yaw and drawn at its scaled footprint:
  // case first, then the pale keyboard end.
  const yaw = PIANO.yaw, s = PIANO.scale || 1, along = Math.abs(Math.cos(yaw)), across = Math.abs(Math.sin(yaw));
  const pw = 2.3 * s * along + 1.56 * s * across, pd = 1.56 * s * along + 2.3 * s * across;
  ctx.fillStyle = '#0d0e11';
  ctx.fillRect(X(PIANO.x - pw / 2), Z(PIANO.z - pd / 2), pw * PPM, pd * PPM);
  const kx = PIANO.x + Math.cos(yaw) * 1.1 * s, kz = PIANO.z - Math.sin(yaw) * 1.1 * s;
  const kw = 0.3 * s * along + 1.44 * s * across, kd = 1.44 * s * along + 0.3 * s * across;
  ctx.fillStyle = '#c8bda4';
  ctx.fillRect(X(kx - kw / 2), Z(kz - kd / 2), kw * PPM, kd * PPM);
}

// The moving parts the engine does not know about: the Vertec in the gym
// (jump beside it and the vanes swing) and the sailboat rocking at the pier.
export function setup({ stage, world, player, avatar, sound, rig }) {
  // The opening screen holds the camera over the island: the swoop down to the
  // player waits until the visitor has pressed 进入世界, so the first thing they
  // see is a world hanging in the air rather than a fly-through already under
  // way. The hold is a pose written after the rig each frame, so the engine's
  // own camera work is untouched.
  let holding = !!document.getElementById('welcome'), entering = false;
  if (holding) {
    window.addEventListener('home:enter', () => {
      holding = false;
      entering = true;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) rig?.startIntro?.(player);
      else { entering = false; window.dispatchEvent(new Event('home:landed')); }
    }, { once: true });
  }
  const vertec = createVertec({ avatar, sound });
  stage.scene.add(vertec.mesh);
  const tv = createTv({ stage, world });
  // The hall's dot-matrix wall keeps its own clock: one uniform per frame.
  const leds = world.animated?.hallLeds;
  const poolGlow = world.animated?.poolGlow;
  return {
    update(dt) {
      // The switches belong to a world already walked into: tell the page when
      // the swoop has landed so it can hand the HUD back then, not earlier.
      if (entering && !rig?.introActive) {
        entering = false;
        window.dispatchEvent(new Event('home:landed'));
      }
      if (holding) {
        const pose = stage.camera.aspect < 0.8 ? INTRO.portrait : INTRO.pos;
        stage.camera.position.set(pose[0], pose[1], pose[2]);
        stage.camera.lookAt(INTRO.look[0], INTRO.look[1], INTRO.look[2]);
      }
      vertec.update(dt, player);
      world.outer.update(dt, stage.camera);
      tv?.update(dt);
      leds?.update(dt);
      // stage.night eases with the mood, so the light on the water follows dusk.
      poolGlow?.update(dt, stage.night);
    },
  };
}
