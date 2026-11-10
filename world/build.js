// Build the Homecraft show-home example. The engine calls build() once at boot,
// then setup() once the player exists.
import { buildIsland } from '@engine/world/terrain.js';
import { buildForest } from '@engine/world/landscape.js';
import { defineHouseBlocks, surfaceAt, buildPool, buildShell } from './house.js';
import { furnish } from './furnish.js';
import { buildOuter } from './outer.js';
import { buildMountain } from './mountain.js';
import { buildRoofAccess } from './roof-access.js';
import { createStainless } from './stainless.js';
import { createVertec } from './vertec.js';
import { createTv } from './tv.js';
import { ISLAND, FOREST, HALL, STAGE, PIANO } from './layout.js';

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
  stage.scene.add(outer.group, mountain.group, roofAccess.group);
  return {
    batches: furn.batches, planes: furn.planes, obstacles: furn.obstacles, lights: furn.lights, bakes: [...furn.lighting, ...outer.lamps, ...mountain.lamps],
    hotspots: furn.hotspots, animated: furn.animated, surfaces: furn.surfaces, forest,
    sites: [outer, mountain], sitesAfter: [roofAccess],
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
  ctx.fillStyle = '#0d0e11';
  ctx.fillRect(X(PIANO.x - 1.05), Z(PIANO.z - 0.78), 2.2 * PPM, 1.56 * PPM);
  ctx.fillStyle = '#c8bda4';
  ctx.fillRect(X(PIANO.x + 0.95), Z(PIANO.z - 0.7), 0.3 * PPM, 1.4 * PPM);
}

// The moving parts the engine does not know about: the Vertec in the gym
// (jump beside it and the vanes swing) and the sailboat rocking at the pier.
export function setup({ stage, world, player, avatar, sound }) {
  const vertec = createVertec({ avatar, sound });
  stage.scene.add(vertec.mesh);
  const tv = createTv({ stage, world });
  return {
    update(dt) {
      vertec.update(dt, player);
      world.outer.update(dt, stage.camera);
      tv?.update(dt);
    },
  };
}
