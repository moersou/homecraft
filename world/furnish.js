// A few readable pieces per station. Furniture is static and batched; the hall
// carries the atmosphere through wood panels, black structure and green marble.
import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { canvasTexture } from '@engine/world/textures.js';
import * as P from './paint.js';
import { createCar } from './car.js';
import { buildFloorPlants } from './plants.js';
import { hangPhotos, PHOTOS } from './gallery.js';
import { HOUSE, HALL, STAGE, PIANO, STUDY, VERTEC, LOFT, STAIRS, GARAGE, POOL, POOL_LAMPS, ENTRANCE, BACKDOOR, ROOF_GLASS, TERRACE, DRIVEWAY } from './layout.js';

const L = {
  // Two interior wood finishes: the existing floor and the wall-panel timber.
  wood: { tex: 'wood_panel' }, floor: { tex: 'greige_floor' },
  panel: { tex: 'wood_panel' }, marble: { tex: 'prada_marble' },
  steel: { tex: 'steel' }, silver: { tex: 'stainless', metal: true }, plaster: { tex: 'plaster' }, velvet: { tex: 'velvet' },
  linen: { tex: 'linen' }, books: { tex: 'bookshelf', top: 'wood_panel' },
  paint: tint => ({ tex: 'paint', tint }),
  light: (tint, emissive = 1) => ({ tex: 'paint', tint, emissive }),
};

export function furnish({ layer }) {
  const B = new BoxBatch(layer), roof = new BoxBatch(layer);
  const batches = { static: B, roof, wallN: new BoxBatch(layer), wallS: new BoxBatch(layer), wallE: new BoxBatch(layer), wallW: new BoxBatch(layer) };
  const obstacles = [], lights = [], lighting = [], hotspots = [], planes = [], animated = {}, surfaces = {};
  const bake = (id, x, y, z, power, radius, direction = null) => lighting.push({ id, position: [x, y, z], power, radius, direction });
  const foot = (x, z, w, d, level = 0) => obstacles.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, level });
  const hot = (id, x, y, z, w, h, d) => hotspots.push({ id, box: new THREE.Box3(new THREE.Vector3(x - w / 2, y, z - d / 2), new THREE.Vector3(x + w / 2, y + h, z + d / 2)) });
  const plane = (w, h, tex, x, y, z, ry = 0, glow = false, rx = 0) => {
    const mat = glow ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshLambertMaterial({ map: tex });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, 0, 'YXZ');
    mesh.receiveShadow = !glow; planes.push(mesh); return mesh;
  };
  const paint = (w, h, fn) => canvasTexture(w, h, fn);
  const table = (x, z, w, d, y = 0, level = 0) => {
    B.box(x, y + 0.76, z, w, 0.1, d, L.wood);
    for (const s of [-1, 1]) B.box(x + s * (w / 2 - 0.12), y, z, 0.12, 0.76, d * 0.85, L.steel);
    foot(x, z, w + 0.1, d + 0.1, level);
  };
  const pendant = (x, z, y, batch = roof) => {
    batch.box(x, y + 0.62, z, 0.04, HOUSE.height - y - 0.62, 0.04, L.steel);
    for (const dx of [-0.19, 0.19]) for (const dz of [-0.19, 0.19]) batch.box(x + dx, y, z + dz, 0.035, 0.62, 0.035, L.steel);
    for (const dy of [0, 0.58]) batch.box(x, y + dy, z, 0.42, 0.04, 0.42, L.steel);
    batch.box(x, y + 0.06, z, 0.3, 0.48, 0.3, L.light(0xffdfa8));
    bake('hall-pendant', x, y + .2, z, 3.2, 13, [0, -1, 0]);
  };
  // Broad 3–4 m panes, divided at one mid-height rail on tall walls. The glass
  // stays merged; a few instanced profiles establish its joints and thickness.
  const glazing = (batch, x, z, width, bottom, height, ry = 0) => batch.at(x, 0, z, ry, () => {
    const count = Math.ceil(width / 3.8);
    for (let i = 0; i <= count; i++) batch.box(-width / 2 + width * i / count, bottom, 0, 0.07, height, 0.1, L.steel);
    for (const y of [bottom, ...(height > 5 ? [bottom + height / 2] : []), bottom + height - 0.07]) batch.box(0, y, 0, width, 0.07, 0.1, L.steel);
  });
  const openDoor = (batch, x, y, z, width, ry) => batch.at(x, y, z, ry, () => {
    batch.box(width / 2, 0, 0, width, 2.8, 0.12, L.panel);
    batch.box(width - 0.2, 1.1, 0.075, 0.035, 0.3, 0.04, L.paint(0xc0b49a));
    batch.box(width - 0.18, 1.15, 0.11, 0.07, 0.04, 0.04, L.steel);
  });

  // Slim black structure frames the warm wood walls and uninterrupted glazing.
  for (const x of [-19.5, 10, 23.5]) {
    B.box(x, 0, HOUSE.z0 + 0.5, 0.35, HOUSE.height, 0.35, L.steel);
    foot(x, HOUSE.z0 + 0.5, 0.4, 0.4);
  }
  for (const z of [1, 12]) {
    B.box(23.5, 0, z, 0.35, HOUSE.height, 0.35, L.steel);
    foot(23.5, z, 0.4, 0.4);
  }
  for (const [x, z] of [[10, 0], [-3, 11], [10, 11]]) {
    B.box(x, 0, z, 0.38, HOUSE.height, 0.38, L.steel);
    foot(x, z, 0.45, 0.45);
  }
  for (const z of [-5, 6]) {
    roof.box(2, HOUSE.height - 0.4, z, HOUSE.x1 - HOUSE.x0, 0.3, 0.3, L.wood);
    for (const x of [-12, 3, 17]) pendant(x, z, 6.5);
  }
  // Flush slim mullions keep the large roof fields readable without dividing
  // the view into opaque metre-wide strips or catching feet on raised joints.
  for (const p of ROOF_GLASS) {
    const width = p.x1 - p.x0, depth = p.z1 - p.z0, count = Math.ceil(width / 4.8);
    for (let i = 0; i <= count; i++) roof.box(p.x0 + width * i / count, HOUSE.height + .94, (p.z0 + p.z1) / 2, .065, .065, depth, L.steel);
    for (const z of [p.z0, p.z1]) roof.box((p.x0 + p.x1) / 2, HOUSE.height + .94, z, width, .065, .065, L.steel);
  }
  // Flush facade panes belong to the inner wall line; the open wood leaves
  // start outside it. The grid retains its cells for collision and lighting.
  for (const [x, width, bottom, height] of [[-11, 18, 0, 9], [13.5, 21, 0, 9], [.5, 5, 3, 6]]) {
    batches.wallS.box(x, bottom, HOUSE.z1 + .02, width, height, .055,
      { tex: 'glass', glass: true }, { tag: 'front-glazing' });
    glazing(batches.wallS, x, HOUSE.z1 + .02, width, bottom, height);
  }
  glazing(batches.wallN, -11, -12.02, 18, 6, 3);
  glazing(batches.wallN, 17.5, -12.02, 13, 6, 3);
  glazing(batches.wallW, -20.02, -7.5, 9, 6, 3, Math.PI / 2);
  glazing(batches.wallW, -20.02, 11.5, 9, 6, 3, Math.PI / 2);
  glazing(batches.wallE, 24.02, 10, 12, 1, 8, Math.PI / 2);
  glazing(B, GARAGE.x0 - 0.02, -7.5, 9, 0, 10, Math.PI / 2);
  glazing(B, GARAGE.x0 - 0.02, 1, 4, 0, 10, Math.PI / 2);
  glazing(B, GARAGE.x0 - 0.02, -2, 2, 3, 7, Math.PI / 2);
  glazing(B, 15, GARAGE.z1 + 0.02, 10, 3, 7);
  // Garage access is an actual open, framed glass door.
  B.at(GARAGE.x0 - 0.02, 0, GARAGE.glassDoor.z0, 0, () => {
    B.box(0.92, 0.1, 0, 1.77, 2.6, 0.055, { tex: 'glass', glass: true });
    for (const x of [0, 1.85]) B.box(x, 0, 0, 0.07, 2.8, 0.09, L.steel);
    for (const y of [0, 2.73]) B.box(0.92, y, 0, 1.85, 0.07, 0.09, L.steel);
    B.box(1.62, 1.05, 0.09, 0.04, 0.45, 0.04, L.paint(0xa5afb0));
  }); foot(GARAGE.x0 + 0.9, GARAGE.glassDoor.z0, 1.95, 0.14);
  // Visible open doors, with clear entry circulation and no door animation.
  for (const x of [ENTRANCE.x0, ENTRANCE.x1]) batches.wallS.box(x, 0, 16.15, 0.12, 3, 0.2, L.steel);
  batches.wallS.box(0.5, 2.9, 16.15, 5.2, 0.1, 0.2, L.steel);
  openDoor(batches.wallS, ENTRANCE.x0, 0, 16.2, 2.35, -Math.PI / 2);
  openDoor(batches.wallS, ENTRANCE.x1, 0, 16.2, 2.35, -Math.PI / 2);
  foot(ENTRANCE.x0, 17.35, 0.16, 2.4); foot(ENTRANCE.x1, 17.35, 0.16, 2.4);
  // Two subdued realtime lights support moving characters. All localized
  // architectural/task light is baked, with the same fittings on phones.
  for (const [x, z, power] of [[2, -5, 55], [15, 8, 35]]) {
    const light = new THREE.PointLight(0xffe6c4, 0, 24, 2);
    light.position.set(x, 4, z); light.userData = { base: power, day: 0.15, priority: 1 }; lights.push(light);
  }

  // An open music hall where the half court used to be: a walnut stage against
  // the panelled west wall, a grand piano on it, and benches facing the stage.
  // Nothing walls it off, so it stays part of the room, lit by the roof glass.
  const hallW = HALL.x1 - HALL.x0, hallD = HALL.z1 - HALL.z0;
  const hall = plane(hallW, hallD, paint(hallW * 32, hallD * 32, (ctx, w, h) => P.paintHall(ctx, w, h, { hall: HALL, origin: { x: HALL.x0, z: HALL.z0 } })), (HALL.x0 + HALL.x1) / 2, 0.014, (HALL.z0 + HALL.z1) / 2, 0, false, -Math.PI / 2);
  hall.name = 'hall-floor';
  // The stage: a low walnut deck with a dark fascia and a brass nosing, low
  // enough to walk onto, so the piano never blocks the way in.
  const stageW = STAGE.x1 - STAGE.x0, stageD = STAGE.z1 - STAGE.z0;
  const stageX = (STAGE.x0 + STAGE.x1) / 2, stageZ = (STAGE.z0 + STAGE.z1) / 2;
  B.box(stageX, 0, stageZ, stageW, STAGE.y, stageD, { tex: 'walnut' });
  B.box(STAGE.x1 - 0.045, 0, stageZ, 0.09, STAGE.y, stageD, L.paint(0x1a1512));
  B.box(STAGE.x1 - 0.045, STAGE.y - 0.012, stageZ, 0.11, 0.024, stageD, L.paint(0xb08d4a));
  // The hall's back wall is a dot-matrix light field instead of timber slats:
  // a dark backing, a slim steel frame, and one shader plane. Droplets land at
  // random spots, spread slowly into rings and fade, like rain on still water.
  // One draw call and one uniform per frame, with no per-frame canvas work.
  const backZ0 = -1.9, backZ1 = 9.1, backH = 4.25;
  const backW = backZ1 - backZ0, backZc = (backZ0 + backZ1) / 2;
  B.box(-19.97, 0, backZc, 0.06, backH, backW, L.paint(0x0a0806));
  B.box(-19.93, 0, backZc, 0.1, 0.14, backW + 0.12, L.steel);
  B.box(-19.93, backH - 0.08, backZc, 0.1, 0.08, backW + 0.12, L.steel);
  for (const z of [backZ0, backZ1]) B.box(-19.93, 0, z, 0.1, backH, 0.1, L.steel);
  const ledW = backW - 0.3, ledH = backH - 0.24, ledY0 = 0.1;
  const ledTime = { value: 0 };
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  ledMat.customProgramCacheKey = () => 'hall-led-wall';
  ledMat.onBeforeCompile = shader => {
    shader.uniforms.uTime = ledTime;
    shader.uniforms.uGrid = { value: new THREE.Vector2(ledW / 0.075, ledH / 0.075) };
    shader.uniforms.uSizeM = { value: new THREE.Vector2(ledW, ledH) };
    shader.uniforms.uLit = { value: new THREE.Color(0xffb347) };
    shader.uniforms.uDim = { value: new THREE.Color(0x2a1c10) };
    shader.vertexShader = 'varying vec2 vLedUv;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvLedUv = uv;');
    shader.fragmentShader = [
      'varying vec2 vLedUv;',
      'uniform float uTime;',
      'uniform vec2 uGrid;',
      'uniform vec2 uSizeM;',
      'uniform vec3 uLit;',
      'uniform vec3 uDim;',
      '',
      '// Hash a slice of time into a pseudo-random 0..1 number.',
      'float ledHash(float n) { return fract(sin(n * 91.7) * 43758.5453); }',
      '',
    ].join('\n') + shader.fragmentShader.replace('#include <color_fragment>', [
      '#include <color_fragment>',
      '{',
      '  // One LED per cell, round and slightly apart, like the clock field.',
      '  vec2 grid = vLedUv * uGrid;',
      '  float dotMask = 1.0 - smoothstep(0.28, 0.46, length(fract(grid) - 0.5));',
      '  vec2 m = vLedUv * uSizeM;',
      '  float T = uTime;',
      '  // Three droplets are in flight, each on its own incommensurate period. A',
      '  // droplet is hashed from its time slice, so it always lands somewhere new,',
      '  // spreads slowly, and fades out with the square of its age.',
      '  float rings = 0.0;',
      '  for (int i = 0; i < 3; i++) {',
      '    float period = i == 0 ? 6.4 : i == 1 ? 9.1 : 12.3;',
      '    float shift = float(i) * 1.9;',
      '    float slot = floor((T + shift) / period);',
      '    float seed = ledHash(slot + float(i) * 13.1);',
      '    float seed2 = ledHash(seed * 37.17 + float(i));',
      '    vec2 origin = uSizeM * vec2(0.06 + 0.88 * ledHash(seed * 7.13), 0.12 + 0.78 * seed2);',
      '    float age = (T + shift) - slot * period;',
      '    float life = 1.0 - age / period;',
      '    float radius = age * (0.95 + 0.5 * seed2);',
      '    float d = length(m - origin);',
      '    float ring = 1.0 - smoothstep(0.0, 0.34, abs(d - radius));',
      '    float wake = (1.0 - smoothstep(0.0, 0.2, abs(d - radius * 0.62))) * 0.22;',
      '    rings += (ring + wake) * life * life;',
      '  }',
      '  float glow = rings + 0.03;',
      '  float twinkle = 0.86 + 0.28 * fract(sin(dot(floor(grid), vec2(12.9898, 78.233))) * 43758.5453);',
      '  glow = clamp(glow * twinkle, 0.0, 1.0);',
      '  diffuseColor.rgb = mix(uDim * 0.75, uLit, glow) * dotMask;',
      '}',
    ].join('\n'));
  };
  const ledWall = new THREE.Mesh(new THREE.PlaneGeometry(ledW, ledH), ledMat);
  ledWall.position.set(-19.87, ledY0 + ledH / 2, backZc);
  ledWall.rotation.y = Math.PI / 2;
  planes.push(ledWall);
  animated.hallLeds = { update: dt => { ledTime.value = (ledTime.value + dt) % 3600; } };

  // The grand piano: satin black case with a stepped wing, an open lid, three
  // legs on casters, pedals and ivory keys. It is drawn at true dimensions and
  // then scaled as a whole, the way the ball and the players' heads are scaled
  // with the blocky bodies: a concert grand that stands up beside a 1.8 m avatar.
  // Static and batched, except the lid, which is one plane on a hinge.
  const ebony = L.paint(0x141519), ebonyEdge = L.paint(0x2d3037), brass = L.paint(0xb08d4a);
  const ivory = L.paint(0xf1ead9), keyBlack = L.paint(0x101114);
  const K = PIANO.scale;
  const piano = (x, z, yaw) => B.at(x, STAGE.y, z, yaw, () => {
    // Every part is written in metres and multiplied here, so proportions hold.
    const box = (cx, y, cz, w, h, d, look, opts) => B.box(cx * K, y * K, cz * K, w * K, h * K, d * K, look, opts);
    // The wing, tail first: five steps along the straight bass side, which is
    // the pianist's left. The long edge sits at +z, so the lid hinges on the
    // bass side and opens over the room whatever the yaw is.
    for (const [x0, x1, z0, z1] of [
      [-1.05, -0.70, 0.18, 0.78],
      [-0.70, -0.30, -0.06, 0.78],
      [-0.30, 0.10, -0.34, 0.78],
      [0.10, 0.55, -0.60, 0.78],
      [0.55, 0.95, -0.78, 0.78],
    ]) box((x0 + x1) / 2, 0.60, (z0 + z1) / 2, x1 - x0, 0.33, z1 - z0, ebony);
    // Keyboard end: key bed, ivory keys and the black keys in their mixed groups.
    box(1.10, 0.60, 0, 0.30, 0.13, 1.56, ebony);
    box(1.07, 0.73, 0, 0.24, 0.022, 1.44, ivory);
    const keyW = 1.44 / 14;
    for (let octave = 0; octave < 2; octave++) for (const i of [0, 1, 3, 4, 5]) {
      const kz = -0.72 + (octave * 7 + i + 1) * keyW;
      box(1.0, 0.752, kz, 0.12, 0.02, keyW * 0.58, keyBlack);
    }
    box(1.14, 0.60, 0, 0.12, 0.05, 1.44, ebonyEdge);
    // Music desk with a white sheet on it, leaning back towards the strings.
    box(0.60, 0.93, 0, 0.05, 0.34, 1.0, ebony, { rz: 0.2 });
    box(0.575, 0.99, 0, 0.02, 0.24, 0.62, L.paint(0xefe9dc), { rz: 0.2 });
    // Three legs with brass casters, and the pedals under the keys.
    for (const [lx, lz] of [[0.82, -0.58], [0.82, 0.58], [-0.76, 0.54]]) {
      box(lx, 0, lz, 0.13, 0.60, 0.13, ebony);
      box(lx, 0, lz, 0.085, 0.06, 0.085, brass);
    }
    for (const pz of [-0.14, 0, 0.14]) box(1.16, 0.05, pz, 0.18, 0.028, 0.055, brass);
    // The prop stick reaches the open lid just above the strings.
    box(0.55, 0.94, 0.075, 0.045, 0.90, 0.045, ebony, { rx: -0.167 });
  });
  piano(PIANO.x, PIANO.z, PIANO.yaw);
  // Footprints turn with the instrument, so a side-on piano blocks the right cells.
  const swing = (w, d) => [
    w * Math.abs(Math.cos(PIANO.yaw)) + d * Math.abs(Math.sin(PIANO.yaw)),
    d * Math.abs(Math.cos(PIANO.yaw)) + w * Math.abs(Math.sin(PIANO.yaw)),
  ];
  foot(PIANO.x, PIANO.z, ...swing(2.5 * K, 1.8 * K));
  // The lid, hinged along the straight bass side (+z) and propped open over the
  // case, so it always rises away from the wall and towards the room.
  const lid = new THREE.Group();
  lid.position.set(PIANO.x, STAGE.y + 0.94 * K, PIANO.z);
  lid.rotation.y = PIANO.yaw;
  const lidGeo = new THREE.PlaneGeometry(1.94 * K, 1.36 * K);
  lidGeo.translate(0, 0.68 * K, 0);
  const lidMesh = new THREE.Mesh(lidGeo, new THREE.MeshLambertMaterial({ color: 0x1b1c22, side: THREE.DoubleSide }));
  lidMesh.position.set(-0.02 * K, 0, 0.78 * K);
  lidMesh.rotation.x = -0.72;
  lid.add(lidMesh);
  planes.push(lid);
  // The pianist's bench, just clear of the keys and turned with the piano.
  const seatX = PIANO.x + Math.cos(PIANO.yaw) * 1.62 * K, seatZ = PIANO.z - Math.sin(PIANO.yaw) * 1.62 * K;
  B.at(seatX, STAGE.y, seatZ, PIANO.yaw, () => {
    B.box(0, 0.48, 0, 0.44, 0.10, 1.36, L.wood);
    B.box(0, 0.58, 0, 0.42, 0.07, 1.3, L.paint(0x5f2a2e));
    for (const bz of [-0.55, 0.55]) B.box(0, 0, bz, 0.09, 0.48, 0.09, L.steel);
  });
  foot(seatX, seatZ, ...swing(0.55, 1.45));
  // A wool rug under the instrument marks the recital corner on the stage.
  const rugW = 4.4, rugD = 5.6;
  const rug = plane(rugW, rugD, paint(rugW * 24, rugD * 24, P.paintRug), -17.1, STAGE.y + 0.006, 4.9, 0, false, -Math.PI / 2);
  rug.name = 'hall-rug';

  // The floor in front of the stage is left open: the hall is a place to walk
  // through, not a seated auditorium.

  // The hall's clock, kept from the old backboard: the LED calendar clock now
  // hangs above the stage, clear of the slat wall and larger than it was, so the
  // month, the time and the day/month/year rings read across the open floor.
  const clockZ = (STAGE.z0 + STAGE.z1) / 2, clockY = 4.45;
  const clockW = 5.4, clockH = clockW * 77 / 165;
  B.box(-19.9, clockY, clockZ, 0.2, clockH + 0.14, clockW + 0.14, L.steel);
  B.box(-19.79, clockY + 0.07, clockZ, 0.02, clockH + 0.02, clockW + 0.02, L.paint(0x0a0b0d));
  surfaces.scoreboard = { position: [-19.77, clockY + 0.07 + clockH / 2, clockZ], rotation: Math.PI / 2, width: clockW, height: clockH };

  // A gallery group on the wall under the bedroom, north of the light screen:
  // three posters sharing one baseline and one continuous light, centred in the
  // span east of the library door, with a low console grounding them.
  const posterZ = -3.94, posterY = 1.15, posterW = 1.15, posterH = 1.72;
  [P.paintYiYiPoster, P.paintRecitalPoster, P.paintNightSeaPoster].forEach((art, i) => {
    const x = -14.9 + (i - 1) * 1.32;
    B.box(x, posterY - 0.06, posterZ - 0.03, posterW + 0.12, posterH + 0.12, 0.06, L.paint(0x141414));
    plane(posterW, posterH, paint(460, 688, art), x, posterY + posterH / 2, posterZ, 0);
  });
  // One light bar for the group, and one bake for it, instead of three fittings.
  B.box(-14.9, posterY + posterH + 0.2, posterZ + 0.12, 3.86, 0.05, 0.14, L.steel);
  B.box(-14.9, posterY + posterH + 0.182, posterZ + 0.15, 3.7, 0.016, 0.09, L.light(0xffe6c0));
  bake('poster-light', -14.9, posterY + posterH + 0.1, posterZ + 0.45, 1.1, 4.6, [0, -1, -0.3]);
  // A low console under the group, so the wall has a base and not just frames.
  B.box(-14.9, 0.72, posterZ + 0.2, 3.3, 0.08, 0.36, L.wood);
  B.box(-14.9, 0.8, posterZ + 0.2, 3.38, 0.03, 0.4, L.marble);
  for (const x of [-16.3, -13.5]) B.box(x, 0, posterZ + 0.2, 0.06, 0.72, 0.32, L.steel);
  foot(-14.9, posterZ + 0.2, 3.42, 0.44);
  B.box(-16.1, 0.83, posterZ + 0.2, 0.3, 0.05, 0.22, L.paint(0x7a2f2a));
  B.box(-16.04, 0.88, posterZ + 0.24, 0.26, 0.045, 0.2, L.paint(0x2f4a44));
  B.box(-13.95, 0.83, posterZ + 0.2, 0.18, 0.22, 0.18, L.paint(0xb08d4a));

  // The library west of the loft: bookcases along its north wall, a reading
  // table under two ceiling lamps, a window seat in the west window and a rug.
  // A doorway lined in wood opens onto the hall beside the posters.
  const libX = (STUDY.x0 + STUDY.x1) / 2, libZ = (STUDY.z0 + STUDY.z1) / 2;
  const bookZ = STUDY.z0 + 0.19;
  for (let x = STUDY.x0 + 0.56; x <= STUDY.x1 - 0.75; x += 1.02) B.box(x, 0, bookZ, 0.96, 2.62, 0.36, L.books);
  foot(libX, bookZ, STUDY.x1 - STUDY.x0 - 0.5, 0.45);
  // A window seat under the west window, with a linen cushion.
  B.box(STUDY.x0 + 0.31, 0, -8, 0.6, 0.44, 2.6, L.wood);
  B.box(STUDY.x0 + 0.31, 0.44, -8, 0.56, 0.1, 2.5, L.linen);
  foot(STUDY.x0 + 0.31, -8, 0.68, 2.7);
  // The reading table, its two chairs and the rug under them.
  table(libX, libZ, 3.0, 1.1);
  const chair = (x, z, ry) => {
    B.at(x, 0, z, ry, () => {
      B.box(0, 0.42, 0, 0.46, 0.06, 0.46, L.wood);
      B.box(0, 0.48, -0.2, 0.46, 0.46, 0.06, L.wood);
      for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) B.box(dx, 0, dz, 0.05, 0.42, 0.05, L.steel);
    });
    foot(x, z, 0.55, 0.55);
  };
  chair(libX, libZ - 1.15, 0); chair(libX, libZ + 1.15, Math.PI);
  plane(4.0, 3.4, paint(96, 82, P.paintRug), libX, 0.012, libZ, 0, false, -Math.PI / 2);
  // Two books left on the table.
  B.box(libX - 0.8, 0.86, libZ, 0.34, 0.05, 0.24, L.paint(0x7a2f2a));
  B.box(libX - 0.74, 0.91, libZ + 0.04, 0.3, 0.045, 0.22, L.paint(0x2f4a44));
  // Ceiling lamps and a floor lamp by the window, since no other light reaches.
  const ceilingLamp = (x, z) => {
    B.box(x, 3.7, z, 0.05, 0.3, 0.05, L.steel);
    B.box(x, 3.58, z, 0.36, 0.1, 0.36, L.light(0xffe3b6));
    bake('library-ceiling', x, 3.46, z, 1.4, 5.6, [0, -1, 0]);
  };
  ceilingLamp(libX - 1.3, libZ); ceilingLamp(libX + 1.3, libZ);
  B.box(STUDY.x0 + 0.6, 0, STUDY.z1 - 0.9, 0.05, 1.6, 0.05, L.steel);
  B.box(STUDY.x0 + 0.6, 1.6, STUDY.z1 - 0.9, 0.36, 0.24, 0.36, L.light(0xffdfa8));
  foot(STUDY.x0 + 0.6, STUDY.z1 - 0.9, 0.3, 0.3);
  bake('library-floor', STUDY.x0 + 0.6, 1.45, STUDY.z1 - 0.9, 0.9, 3.8, [0, -1, 0]);
  // The doorway, lined in wood, rising to the poster group's light bar.
  for (const x of [STUDY.door.x0, STUDY.door.x1]) B.box(x, 0, STUDY.z1 + 0.5, 0.12, 3.06, 1.04, L.wood);
  B.box((STUDY.door.x0 + STUDY.door.x1) / 2, 3.0, STUDY.z1 + 0.5, STUDY.door.x1 - STUDY.door.x0, 0.1, 1.04, L.wood);

  // Three soft spots wash the stage and two sconces warm the slat wall.
  for (const z of [0, 3.5, 7]) bake('hall-stage', -16.6, 6.2, z, 2.6, 8, [0.15, -1, 0]);
  for (const z of [-0.6, 7.6]) bake('hall-sconce', -19.5, 3.3, z, 1.1, 5, [1, -0.4, 0]);

  // A distinct rubber training zone: pull-ups, free weights, cable machine,
  // treadmill and an exercise bike, all static instances in the same batch.
  B.box(-12.15, 0, 13.7, 14.4, 0.025, 3.6, L.paint(0x383e3d));
  const frame = L.paint(0x747d80), pad = L.paint(0x242a2d);
  for (const x of [-19.3, -17.8]) B.box(x, 0, 13.8, 0.09, 2.4, 0.09, frame);
  B.box(-18.55, 2.35, 13.8, 1.6, 0.07, 0.07, L.steel);
  B.box(-18.55, 0, 13.8, 1.8, 0.06, 0.8, frame); foot(-18.55, 13.8, 1.9, 0.9);
  for (const x of [-16.35, -14.85]) B.box(x, 0, 14.5, 0.08, 0.9, 0.5, frame);
  for (const y of [0.15, 0.65]) {
    B.box(-15.6, y, 14.5, 1.6, 0.05, 0.5, frame);
    for (const x of [-16.15, -15.6, -15.05]) {
      B.box(x, y + 0.05, 14.5, 0.4, 0.06, 0.05, L.paint(0xb5b8b4));
      for (const s of [-1, 1]) B.box(x + s * 0.14, y + 0.04, 14.5, 0.12, 0.17, 0.2, L.steel);
    }
  }
  foot(-15.6, 14.5, 1.7, 0.6);
  B.box(-15.6, 0.4, 12.7, 1.7, 0.14, 0.48, pad);
  for (const x of [-16.2, -15]) B.box(x, 0, 12.7, 0.1, 0.4, 0.45, frame);
  foot(-15.6, 12.7, 1.8, 0.6);
  // Cable tower, with two stacks and contrasting cables/pulley housings.
  B.box(-11.8, 0, 14.4, 2.1, 0.08, 0.8, frame);
  for (const x of [-12.7, -10.9]) {
    B.box(x, 0.08, 14.4, 0.09, 2.25, 0.09, frame);
    B.box(x, 0.08, 14.65, 0.4, 0.75, 0.3, pad);
    for (let i = 0; i < 6; i++) B.box(x, 0.15 + i * 0.1, 14.82, 0.3, 0.025, 0.025, frame);
    B.box(x, 0.8, 14.12, 0.025, 1.25, 0.025, L.paint(0xb8bdbb));
    B.box(x, 1.05, 14.08, 0.3, 0.05, 0.08, pad);
    B.box(x, 2.03, 14.25, 0.22, 0.22, 0.1, pad);
  }
  B.box(-11.8, 2.25, 14.4, 2.05, 0.1, 0.12, frame); foot(-11.8, 14.4, 2.2, 1);
  // Treadmill belt and raised front console face into the room.
  B.box(-8.3, 0.05, 13.8, 1.15, 0.18, 2.05, frame);
  B.box(-8.3, 0.23, 13.85, 0.86, 0.035, 1.7, pad);
  for (const x of [-8.83, -7.77]) {
    B.box(x, 0.22, 12.97, 0.075, 1.05, 0.075, frame);
    B.box(x, 1.1, 13.18, 0.075, 0.06, 0.55, pad);
  }
  B.box(-8.3, 1.15, 12.95, 1.02, 0.32, 0.18, pad, { rx: -0.2 });
  B.box(-8.3, 1.24, 13.055, 0.35, 0.15, 0.025, L.paint(0x617d82)); foot(-8.3, 13.8, 1.25, 2.2);
  // Spinning bike: recognizable flywheel, saddle and high handlebars.
  B.at(-11.7, 0, 12.2, 0, () => {
    for (const z of [-0.48, 0.48]) B.box(0, 0.05, z, 0.7, 0.06, 0.1, frame);
    B.box(0, 0.12, 0, 0.09, 0.54, 0.8, frame, { rx: -0.15 });
    B.box(0, 0.22, -0.3, 0.14, 0.55, 0.55, pad);
    B.box(0, 0.4, 0.33, 0.055, 0.52, 0.055, frame);
    B.box(0, 0.9, 0.33, 0.38, 0.08, 0.25, pad);
    B.box(0, 0.65, -0.4, 0.06, 0.52, 0.06, frame);
    B.box(0, 1.16, -0.4, 0.52, 0.06, 0.15, pad);
    B.box(0, 0.38, 0.05, 0.5, 0.05, 0.08, frame);
    for (const x of [-0.23, 0.23]) B.box(x, 0.32, 0.05, 0.12, 0.05, 0.2, pad);
  }); foot(-11.7, 12.2, 0.85, 1.25);
  // The Vertec's weighted base, pole and the collar under its vanes (the vanes
  // swing, so they live in vertec.js). He stands under them, so only the base blocks.
  B.box(VERTEC.x, 0, VERTEC.z, 0.62, 0.07, 0.62, pad);
  B.box(VERTEC.x, 0.07, VERTEC.z, 0.36, 0.16, 0.36, frame);
  B.box(VERTEC.x, 0.07, VERTEC.z, 0.07, 3.33, 0.07, L.steel);
  for (const y of [2.56, 3.4]) B.box(VERTEC.x, y, VERTEC.z, 0.11, 0.05, 0.11, pad);
  foot(VERTEC.x, VERTEC.z, 0.66, 0.66);

  // A generous master suite fills the mezzanine. Keep the broad stair and the
  // sealed save alcove, while removing the study desk and repeated book storage.
  const railW = STAIRS.x0 - LOFT.x0, railX = (LOFT.x0 + STAIRS.x0) / 2;
  foot(railX, LOFT.z1 - 0.1, railW, 0.2, 1);
  const steps = 16, run = (STAIRS.z1 - STAIRS.z0) / steps;
  const stairX = (STAIRS.x0 + STAIRS.x1) / 2, stairZ = (STAIRS.z0 + STAIRS.z1) / 2;
  const stairWidth = STAIRS.x1 - STAIRS.x0 - .3;
  for (let i = 0; i < steps; i++) {
    const z = STAIRS.z1 - (i + 0.5) * run, y = (i + 1) * LOFT.y / steps;
    B.box(stairX, 0, z, stairWidth - .05, y - 0.06, run, L.steel);
    B.box(stairX, y - 0.06, z, stairWidth, 0.06, run, L.floor);
    // Recessed into each riser: the tread edge reads without a glaring rail.
    B.box(stairX, y - .12, z + run / 2 + .012, stairWidth - .4, .035, .025, L.light(0xffdba6, .45));
    if (i % 2 === 0) bake('stair-tread', stairX, y + .12, z + run / 2, .28, 2.2, [0, -1, 1]);
  }
  const length = Math.hypot(STAIRS.z1 - STAIRS.z0, LOFT.y), slope = Math.atan2(LOFT.y, STAIRS.z1 - STAIRS.z0);
  // A rail on the open west side; the east side is the panelled TV wall.
  for (const x of [STAIRS.x0 + 0.1]) {
    B.box(x, LOFT.y / 2 + 0.93, stairZ, 0.065, 0.065, length, L.steel, { rx: slope });
    for (const t of [0.04, 0.27, 0.5, 0.73, 0.96]) {
      const z = STAIRS.z1 - t * (STAIRS.z1 - STAIRS.z0);
      const y = (STAIRS.z1 - z) * LOFT.y / (STAIRS.z1 - STAIRS.z0);
      B.box(x, y, z, 0.06, 0.95, 0.06, L.steel);
    }
  }

  // Two independent sit/stand desks form an L, as in the owner's workspace.
  // One ultrawide + laptop, one pair of monitors + tower, each with its own chair.
  const wallpaper = paint(192, 72, P.paintForestScreen);
  const desk = (x, z, width, ry, dual) => {
    const top = 1.05;
    B.at(x, 0, z, ry, () => {
      B.box(0, top, 0, width, 0.075, 0.95, L.panel);
      for (const lx of [-width / 2 + 0.23, width / 2 - 0.23]) {
        B.box(lx, 0, 0, 0.23, 0.06, 0.92, L.steel);
        B.box(lx, 0.06, 0, 0.18, 0.55, 0.18, L.steel);
        B.box(lx, 0.61, 0, 0.12, top - 0.61, 0.12, L.paint(0x646d6e));
      }
      B.box(0, 0.9, 0, width - 0.45, 0.07, 0.12, L.steel);
      B.box(width / 2 - 0.2, 1, 0.49, 0.2, 0.05, 0.06, L.steel);
      B.box(0, top + 0.075, 0.2, dual ? 1.8 : 1.4, 0.012, 0.42, L.paint(0x233932));
      for (const lx of dual ? [-0.54, 0.54] : [-0.17]) {
        const sw = dual ? 0.96 : 1.55, sh = dual ? 0.59 : 0.62;
        B.box(lx, top + 0.08, -0.23, 0.25, 0.035, 0.18, L.steel);
        B.box(lx, top + 0.1, -0.23, 0.065, 0.21, 0.065, L.steel);
        B.box(lx, top + 0.29, -0.23, sw, sh, 0.07, L.steel);
        const wx = x + Math.cos(ry) * lx + Math.sin(ry) * -0.19;
        const wz = z - Math.sin(ry) * lx + Math.cos(ry) * -0.19;
        plane(sw - 0.08, sh - 0.07, wallpaper, wx, top + 0.29 + sh / 2, wz, ry, true);
      }
      B.box(-0.1, top + 0.09, 0.22, 0.73, 0.025, 0.21, L.paint(0x7a8080));
      B.box(0.52, top + 0.09, 0.22, 0.09, 0.035, 0.13, L.steel);
      if (dual) {
        B.box(-1.03, top + 0.08, -0.05, 0.28, 0.65, 0.42, L.steel);
        B.box(-1.03, top + 0.16, 0.165, 0.22, 0.46, 0.015, L.paint(0x333c3e));
        B.box(0.98, top + 0.12, -0.34, 0.045, 0.4, 0.045, L.steel);
        B.box(0.84, top + 0.45, -0.24, 0.32, 0.045, 0.05, L.steel, { rz: 0.4 });
        B.box(0.69, top + 0.26, -0.18, 0.07, 0.17, 0.07, L.steel);
      } else {
        B.box(1, top + 0.08, 0.03, 0.42, 0.025, 0.29, L.paint(0xa6adad));
        B.box(1, top + 0.11, -0.1, 0.42, 0.25, 0.025, L.steel, { rx: -0.14 });
        B.box(1, top + 0.15, -0.08, 0.35, 0.18, 0.009, L.paint(0x426358));
      }
    });
    foot(x, z, ry ? 1.05 : width + 0.1, ry ? width + 0.1 : 1.05);
  };
  desk(2.3, -10.95, 3.3, 0, false);
  desk(5.45, -9.45, 3.2, -Math.PI / 2, true);
  // Black task bars sit above the monitors and throw light onto the desks.
  B.box(2.13, 2.01, -11.18, 1.5, .055, .13, L.steel);
  B.box(2.13, 1.993, -11.1, 1.38, .018, .075, L.light(0xffefd9));
  B.box(5.68, 1.98, -9.45, .13, .055, 1.9, L.steel);
  B.box(5.6, 1.963, -9.45, .075, .018, 1.78, L.light(0xffefd9));
  bake('desk-single', 2.13, 2, -10.9, .95, 4, [0, -1, .3]);
  bake('desk-dual', 5.4, 2, -9.45, .95, 4, [-.3, -1, 0]);
  // A white mug of coffee on the single desk.
  B.at(2.3, 0, -10.95, 0, () => {
    B.box(-1.05, 1.125, 0.25, 0.1, 0.11, 0.1, L.paint(0xf4f1ea));
    B.box(-0.9875, 1.15, 0.25, 0.025, 0.065, 0.02, L.paint(0xf4f1ea));
    B.box(-1.05, 1.234, 0.25, 0.086, 0.003, 0.086, L.paint(0x3b2a20));
  });
  ergonomicChair(B, 2.1, -9.55, 0); foot(2.1, -9.55, 0.85, 0.85);
  ergonomicChair(B, 4.05, -9.1, -Math.PI / 2); foot(4.05, -9.1, 0.85, 0.85);
  // The thinking board is mounted directly on the north wall, leaving the
  // aisle open. The chalk content remains a draft of ideas and future goals.
  B.box(-1.05, 0.85, -11.91, 3.6, 2.45, 0.12, L.panel);
  plane(3.43, 2.28, canvasTexture(1536, 1024, P.paintIdeasBoard, { pixelated: false }), -1.05, 2.075, -11.84);
  B.box(-1.05, 3.31, -11.8, 3.5, 0.025, 0.055, L.light(0xffdfa7));
  bake('thinking-board', -1.05, 3.34, -11.5, 1.15, 4, [0, -1, -.3]);
  // A black pegboard, about the chalkboard's size, is mounted over the wall
  // panelling behind the two desks, with a few sheets pinned to it.
  const pegX = 2.95, pegFace = -11.84, pegDepth = .06;
  B.box(pegX, 1.1, pegFace - pegDepth / 2, 3.6, 2.2, pegDepth, L.steel, { tag: 'work-wall-pegboard' });
  plane(3.6, 2.2, paint(1080, 660, P.paintPegboard), pegX, 2.2, pegFace + .005);
  hot('works', 2, 0, -9.7, 7.3, 3.4, 4.5);

  // The owner's photographs, on the blank panelling above the pegboard. The
  // wall reflows as prints are added: see world/gallery.js.
  hangPhotos({
    photos: PHOTOS,
    box: (x, y, z, w, h, d) => B.box(x, y, z, w, h, d, L.wood),
    plane,
    x0: -1.6, x1: 9.8, bottom: 3.72, z: -11.85, frameZ: -11.91,
  });

  // Three framed keepsakes remain as decoration, without an interactive page.
  B.box(7.7, 0, -11.6, 3.4, 0.65, 0.6, L.wood); foot(7.7, -11.6, 3.5, 0.7);
  for (const [x, kind] of [[6.5, 'cert'], [7.7, 'diploma'], [8.9, 'jersey']]) {
    B.box(x, 1.7, -11.9, 0.95, 1.2, 0.08, L.wood);
    const art = kind === 'jersey' ? paint(80, 104, P.paintJersey) : paint(40, 52, (ctx, w, h) => P.paintCertificate(ctx, w, h, { kind }));
    plane(0.81, 1.06, art, x, 2.3, -11.85);
    B.box(x, 3.13, -11.74, .74, .07, .14, L.steel);
    B.box(x, 3.115, -11.65, .65, .018, .1, L.light(0xffe9c9));
    bake('honors-wash', x, 3.12, -11.52, .65, 3.2, [0, -1, -.35]);
  }

  // Lounge: the sofa faces a large TV and a low media console.
  B.box(1, 0, -3.2, 5.6, 0.025, 4.5, L.linen);
  const sofa = L.paint(0x1c1e20);
  B.box(3, 0.08, -3.2, 1, 0.48, 3.6, sofa);
  B.box(3.45, 0.48, -3.2, 0.2, 0.62, 3.6, sofa);
  for (const z of [-4.9, -1.5]) B.box(3, 0.08, z, 1, 0.65, 0.2, sofa);
  foot(3, -3.2, 1.2, 3.8); hot('about', 3, 0, -3.2, 1.4, 1.2, 4);
  B.box(0.3, 0, -3.2, 1.4, 0.45, 1.8, L.marble); foot(0.3, -3.2, 1.5, 1.9);
  // The stair's east side is the TV wall: a panelled balustrade climbs with
  // the flight, stepped like the treads, and the back rooms' face beside it is
  // panelled flush, so screen, fireplace and calendar share one plane (x = WALL).
  const WALL = STAIRS.x1;
  for (let i = 0; i < steps; i++) {
    const z = STAIRS.z1 - (i + 0.5) * run, y = (i + 1) * LOFT.y / steps;
    B.box(WALL - 0.09, 0, z, 0.18, y + 0.93, run, L.panel);
  }
  B.box(WALL + 0.015, 0, -5.7, 0.03, LOFT.y, 3.4, L.panel);
  foot(WALL - 0.09, 0, 0.3, STAIRS.z1 - STAIRS.z0);
  // Low black fireplace, flanked by media cabinets. Warmth comes from one
  // tiny flame mesh and static emissive trim, without another point light.
  B.box(WALL + 0.35, 0, -3.2, 0.65, 0.1, 4.65, L.steel);
  B.box(WALL + 0.06, 0.1, -3.2, 0.06, 0.62, 4.65, L.steel);
  for (const z of [-5.025, -1.375]) B.box(WALL + 0.35, 0.1, z, 0.6, 0.62, 1, L.panel);
  B.box(WALL + 0.35, 0.72, -3.2, 0.68, 0.08, 4.65, L.steel);
  // Flames rise straight from the firebox floor, well inside the opening: with
  // each blade's half-width and sway, the outermost stay clear of the cabinets.
  surfaces.fireplace = { position: [WALL + 0.37, 0.1, -3.2], rotation: Math.PI / 2, width: 2.1, height: 0.44 };
  // A small sunset print beside the screen, with a quiet brown frame.
  B.box(WALL + 0.065, 1.48, -5.95, 0.07, 1.14, 0.76, L.paint(0x554e42));
  plane(0.70, 1.08, paint(128, 198, P.paintPoster), WALL + 0.11, 2.05, -5.95, Math.PI / 2);
  B.box(WALL + 0.075, 0.98, -3.2, 0.09, 2.14, 3.74, L.steel);
  // The TV plays an aerial screensaver over a city at night; world/aerial.js
  // draws it into a render target that main.js puts on this screen.
  surfaces.tvScreen = plane(3.6, 2, null, WALL + 0.125, 2.05, -3.2, Math.PI / 2, true);
  foot(WALL + 0.35, -3.2, 0.75, 4.75);
  B.box(WALL + 0.7, 0.7, -3.2, 0.04, 0.025, 2.6, L.light(0xffbd67));
  bake('fireplace', WALL + .8, .5, -3.2, .45, 3.8);
  // One shaded floor lamp warms the sofa end, below the hall's high pendants.
  B.box(4.05, 0, -5.05, .5, .055, .5, L.steel);
  B.box(4.05, .055, -5.05, .065, 1.72, .065, L.steel);
  B.box(4.05, 1.75, -5.05, .7, .25, .7, L.linen);
  B.box(4.05, 1.728, -5.05, .56, .025, .56, L.light(0xffe4ba));
  foot(4.05, -5.05, .55, .55);
  bake('sofa-lamp', 4.05, 1.72, -5.05, 1.05, 5.8, [0, -1, 0]);

  // Open silver kitchen: a clear appliance wall and cooking aisle behind the
  // green island. Silver shares one PBR batch; seams stay with opaque fittings.
  B.box(16, 0, 4.4, 8.4, 0.1, 0.82, L.steel);
  B.box(16, 0.1, 4.4, 8.4, 0.76, 0.82, L.silver);
  B.box(16, 0.86, 4.4, 8.6, 0.1, 1, L.silver); foot(16, 4.4, 8.7, 1.05);
  B.box(16, 0.96, 4.06, 8.6, 2.1, 0.09, L.silver);
  for (const x of [12.9, 14, 15.1, 16.2, 18.6, 19.6]) {
    B.box(x, 0.1, 4.825, 0.018, 0.73, 0.012, L.paint(0x697779));
    B.box(x + 0.34, 0.72, 4.848, 0.35, 0.025, 0.025, L.steel);
  }
  // Double-rimmed inset sink and a bright gooseneck tap.
  B.box(14.25, 0.965, 4.42, 1.07, 0.018, 0.64, L.paint(0x72878b));
  B.box(14.25, 0.985, 4.42, 0.85, 0.012, 0.48, L.steel);
  B.box(14.25, 0.999, 4.42, 0.72, 0.008, 0.36, L.paint(0x556b70));
  B.box(14.25, 0.96, 4.07, 0.07, 0.49, 0.07, L.silver);
  B.box(14.25, 1.4, 4.24, 0.07, 0.05, 0.39, L.silver);
  B.box(14.25, 1.31, 4.4, 0.07, 0.1, 0.07, L.silver);
  B.box(14.49, 0.98, 4.14, 0.13, 0.05, 0.08, L.silver);
  // Black cooktop with four large burners, directly under the metal hood.
  B.box(17.6, 0.965, 4.4, 1.23, 0.025, 0.73, L.steel);
  for (const x of [17.29, 17.91]) for (const z of [4.2, 4.57]) {
    B.box(x, 0.991, z, 0.32, 0.01, 0.26, L.silver);
    B.box(x, 1.002, z, 0.25, 0.008, 0.19, L.steel);
  }
  // Embedded oven, silver surround and glass door; warm display is static.
  B.box(17.6, 0.12, 4.84, 1.09, 0.65, 0.035, L.silver);
  B.box(17.6, 0.2, 4.868, 0.89, 0.43, 0.018, L.steel);
  B.box(17.6, 0.26, 4.881, 0.71, 0.29, 0.01, L.paint(0x3e5154));
  for (const y of [0.32, 0.44]) B.box(17.6, y, 4.892, 0.63, 0.012, 0.008, L.paint(0x99a9a6));
  B.box(17.6, 0.63, 4.896, 0.76, 0.035, 0.065, L.silver);
  B.box(17.6, 0.71, 4.881, 0.16, 0.04, 0.01, L.light(0xdac48b));
  for (const x of [17.22, 17.98]) B.box(x, 0.69, 4.896, 0.08, 0.08, 0.045, L.steel);
  B.box(14.15, 2.15, 4.24, 4.1, 0.9, 0.62, L.silver);
  for (const x of [12.62, 13.65, 14.68, 15.7]) B.box(x, 2.15, 4.555, 0.014, 0.9, 0.01, L.paint(0x697779));
  // The silver work wall has no cabinet strip light or localized light wash.
  B.box(17.6, 2.12, 4.28, 1.9, 0.24, 0.86, L.silver);
  B.box(17.6, 2.35, 4.2, 0.74, 0.71, 0.4, L.silver);
  B.box(17.6, 2.1, 4.68, 1.72, 0.055, 0.03, L.steel);
  // Tall double-door refrigerator anchors the end of the cooking line.
  B.box(20.9, 0, 4.4, 1.2, 2.5, 1.05, L.silver); foot(20.9, 4.4, 1.3, 1.15);
  B.box(20.9, 0.08, 4.93, 0.025, 2.34, 0.012, L.paint(0x697779));
  for (const x of [20.77, 21.03]) B.box(x, 0.95, 4.964, 0.035, 0.64, 0.055, L.steel);
  B.box(20.64, 1.86, 4.95, 0.19, 0.2, 0.015, L.steel);
  // The silver return connects the cooking line to the green island, forming
  // an open U with a wide working area and entry on the left. It stops short
  // of the island's stone top, so the two counters never share a surface.
  B.box(19.3, 0, 6.02, .88, .1, 3.5, L.steel);
  B.box(19.3, .1, 6.02, .88, .76, 3.5, L.silver);
  B.box(19.3, .86, 6.02, 1, .1, 3.5, L.silver); foot(19.3, 6.02, 1.08, 3.6);
  for (const z of [5.1, 6, 6.9]) {
    B.box(18.848, .1, z, .012, .73, .018, L.paint(0x73736f));
    B.box(18.824, .7, z + .31, .035, .025, .33, L.steel);
  }
  B.box(17.5, 0, 8.5, 3.7, .08, 1.2, L.steel);
  B.box(17.5, .08, 8.5, 3.7, .76, 1.2, L.panel);
  B.box(17.5, .84, 8.5, 3.9, .12, 1.35, L.marble);
  for (const x of [15.6, 19.4]) B.box(x, 0, 8.5, .1, .96, 1.35, L.marble);
  foot(17.5, 8.5, 4, 1.45);
  // Low, restrained linear pendant centred over the waterfall island.
  for (const x of [16.25, 18.75]) B.box(x, 3.3, 8.5, .025, HOUSE.height - 3.3, .025, L.steel, { shadow: false });
  B.box(17.5, 3.22, 8.5, 3.5, .09, .18, L.steel);
  B.box(17.5, 3.195, 8.5, 3.32, .025, .12, L.light(0xffe9c9));
  for (const x of [16.35, 17.5, 18.65]) bake('island-pendant', x, 3.18, 8.5, .9, 5, [0, -1, 0]);
  for (const x of [16.6, 18.2]) {
    for (const z of [9.6, 9.98]) B.box(x, 0, z, 0.42, 0.66, 0.04, L.steel);
    B.box(x, 0.66, 9.8, 0.48, 0.09, 0.48, L.panel); foot(x, 9.8, 0.58, 0.58);
  }
  B.box(16, 0, 12.8, 3.2, 0.025, 3.6, L.linen);
  table(16, 12.8, 2, 1);
  B.box(16, 2.75, 12.8, .025, HOUSE.height - 2.75, .025, L.steel, { shadow: false });
  B.box(16, 2.66, 12.8, 1.65, .09, .22, L.steel);
  B.box(16, 2.637, 12.8, 1.48, .025, .15, L.light(0xffe4ba));
  bake('dining-pendant', 16, 2.62, 12.8, 1.45, 5.5, [0, -1, 0]);
  for (const x of [15.45, 16.55]) for (const z of [11.8, 13.8]) {
    for (const dx of [-0.2, 0.2]) for (const dz of [-0.2, 0.2]) B.box(x + dx, 0, z + dz, 0.045, 0.44, 0.045, L.steel);
    B.box(x, 0.44, z, 0.5, 0.07, 0.5, L.paint(0x1c1f21));
    B.box(x, 0.51, z + Math.sign(z - 12.8) * 0.23, 0.5, 0.43, 0.06, L.paint(0x1c1f21)); foot(x, z, 0.6, 0.6);
  }
  // Dining sideboard doubles as the coffee station, with a green marble top.
  B.box(8, 0, 14.8, 5, 0.08, 0.65, L.steel);
  B.box(8, 0.08, 14.8, 5, 0.74, 0.65, L.panel);
  B.box(8, 0.82, 14.8, 5.2, 0.1, 0.76, L.marble); foot(8, 14.8, 5.3, 0.85);
  B.box(7, 0.92, 14.8, 0.8, 0.58, 0.55, L.steel);
  B.box(7, 0.98, 14.49, 0.65, 0.28, 0.03, L.paint(0xc5c5be));
  B.box(8, 2.15, 15.3, 4.8, .08, .18, L.steel);
  B.box(8, 2.125, 15.24, 4.65, .025, .1, L.light(0xffe9c9));
  for (const x of [6.5, 9.5]) bake('coffee-counter', x, 2.1, 15.1, 1, 4.5, [0, -1, -.2]);
  hot('coffee', 8, 0, 14.8, 5.4, 1.7, 1.1);

  // Black 2025 refreshed Model Y, with continuous white/red lamps lit.
  planes.push(createCar(B, 15.5, -6.5));
  B.box(15.5, 4.1, -6.5, .24, .09, 5.6, L.steel);
  B.box(15.5, 4.075, -6.5, .15, .025, 5.4, L.light(0xffefd9));
  for (const z of [-8.3, -4.7]) bake('garage-linear', 15.5, 4.05, z, 1.7, 7, [0, -1, 0]);
  foot(15.5, -6.5, 4.85, 2.25); hot('lab', 15.5, 0, -6.5, 5.2, 1.8, 3);
  B.box(19.2, 0, -11.4, 0.8, 1.8, 0.9, L.steel);
  plane(0.65, 1.65, paint(32, 62, P.paintRack), 19.2, 0.95, -10.94, 0, true);
  foot(19.2, -11.4, 0.9, 1);
  // The back door: a black steel frame through the wall and a mat outside.
  for (const x of [BACKDOOR.x0 + 0.05, BACKDOOR.x1 - 0.05]) B.box(x, 0, HOUSE.z0 - 0.5, 0.1, 3, 1.12, L.steel);
  B.box((BACKDOOR.x0 + BACKDOOR.x1) / 2, 2.92, HOUSE.z0 - 0.5, BACKDOOR.x1 - BACKDOOR.x0, 0.1, 1.12, L.steel);
  B.box((BACKDOOR.x0 + BACKDOOR.x1) / 2, 0, HOUSE.z0 - 1.75, 1.6, 0.02, 0.9, L.paint(0x4a4038));

  // Full-floor master suite: sleeping zone, dressing wall and a small bench.
  // The glass front and a wood door folded against it preserve a broad entry.
  B.box(-9.6, LOFT.y + .35, -4.14, 6.8, 2.65, .055, { tex: 'glass', glass: true });
  glazing(B, -9.6, -4.14, 6.8, LOFT.y, 3);
  for (const x of [-6, -3]) B.box(x, LOFT.y, -4.1, .07, 2.9, .1, L.steel);
  B.box(-4.5, LOFT.y + 2.83, -4.1, 3, .07, .1, L.steel);
  openDoor(B, -6, LOFT.y, -4.02, 2.75, Math.PI);
  foot(-7.38, -4.03, 2.85, .15, 1);
  const bedX = -10.6, bedZ = -9.65, bedY = LOFT.y;
  B.box(bedX, bedY, -8.45, 4.8, .025, 6.4, L.linen);
  B.box(bedX, bedY, -11.86, 4.2, 2.3, .1, L.panel);
  B.box(bedX, bedY + .3, -11.79, 3.6, 1.5, .07, L.marble);
  B.box(bedX, bedY + 2.27, -11.77, 4.0, .025, .035, L.light(0xffe2ae));
  for (const x of [bedX - 1.4, bedX + 1.4]) bake('headboard-cove', x, bedY + 2.3, -11.5, 1.05, 5.5, [0, -.7, 1]);
  B.box(bedX, bedY, bedZ, 3.25, .28, 3.15, L.panel);
  B.box(bedX, bedY + .28, bedZ, 3.1, .28, 3, L.linen);
  B.box(bedX, bedY, bedZ - 1.52, 3.4, 1.02, .15, L.paint(0x4a514b));
  B.box(bedX, bedY + .56, bedZ + .38, 3.1, .1, 2.05, L.paint(0xbab2a5));
  for (const x of [bedX - .76, bedX + .76]) B.box(x, bedY + .56, bedZ - .9, 1.05, .17, .58, L.linen);
  foot(bedX, bedZ, 3.45, 3.3, 1);
  for (const x of [bedX - 1.9, bedX + 1.9]) {
    B.box(x, bedY, bedZ - .64, .85, .64, .8, L.panel);
    B.box(x, bedY + .64, bedZ - .64, .9, .055, .85, L.marble); foot(x, bedZ - .64, .95, .9, 1);
    B.box(x, bedY + .7, bedZ - .64, .11, .38, .11, L.steel);
    B.box(x, bedY + 1.03, bedZ - .64, .3, .11, .3, L.light(0xffdfa8));
    bake('bedside-lamp', x, bedY + 1.06, bedZ - .64, .75, 3.5);
  }
  B.box(-6.2, LOFT.y, -11.38, 4.6, 2.8, .95, L.panel); foot(-6.2, -11.38, 4.7, 1.05, 1);
  B.box(-6.2, LOFT.y + 2.82, -10.82, 4.4, .065, .17, L.steel);
  B.box(-6.2, LOFT.y + 2.8, -10.76, 4.25, .02, .1, L.light(0xffe9c9));
  for (const x of [-7.5, -5]) bake('wardrobe-wash', x, LOFT.y + 2.77, -10.65, 1.1, 5.5, [0, -1, -.2]);
  for (const x of [-7.85, -6.72, -5.59, -4.46]) {
    B.box(x, LOFT.y, -10.893, .015, 2.75, .012, L.steel);
    B.box(x + .15, LOFT.y + 1.15, -10.87, .025, .6, .025, L.steel);
  }
  // The bench stands against the foot of the bed, a hand's width clear.
  const benchZ = bedZ + 1.575 + .05 + .36;
  B.box(bedX, LOFT.y + .08, benchZ, 3.1, .41, .72, L.paint(0x1f2224));
  for (const x of [bedX - 1.3, bedX + 1.3]) B.box(x, LOFT.y, benchZ, .08, .08, .52, L.steel);
  foot(bedX, benchZ, 3.2, .82, 1);
  // The bedroom's whole west wall is one mural: layered ridges fading into dawn
  // mist, edge to edge and floor to ceiling, with no frame at all.
  const muralW = 7.96, muralH = 5.86;
  plane(muralW, muralH, paint(1024, 752, P.paintMountainMural), -12.985, LOFT.y + 0.05 + muralH / 2, -8, Math.PI / 2);
  hot('writing', bedX, LOFT.y, bedZ, 3.6, 1.15, 3.5);

  // A quiet terrace and still pool outside. No games corner, string lights,
  // solar array or lawn lettering.
  table(-13, 19, 2.8, 1.1);
  for (const x of [-14.8, -11.2]) { B.box(x, 0, 19, 0.65, 0.45, 0.65, L.wood); foot(x, 19, 0.7, 0.7); }
  // Shielded door sconces and a tiny terrace table lamp guide arrival.
  for (const x of [-1.3, 2.3]) {
    B.box(x, 2.28, 16.32, .18, .52, .17, L.steel);
    B.box(x, 2.27, 16.34, .13, .025, .13, L.light(0xffe4ba));
    bake('entry-sconce', x, 2.22, 16.45, .85, 5, [0, -1, .3]);
  }
  B.box(-13, .86, 19, .13, .25, .13, L.steel);
  B.box(-13, 1.08, 19, .3, .065, .3, L.light(0xffe4ba));
  bake('terrace-table', -13, 1.1, 19, .65, 3.2);
  // Black steel ground bollards along the terrace edge and the drive, the same
  // fitting as the ones up the mountain: after dark the grounds are walkable.
  function bollard(x, z) {
    B.box(x, -.2, z, .15, 1.02, .15, L.steel);
    B.box(x, .72, z, .19, .13, .19, L.light(0xffe4ba));
    B.box(x, .85, z, .23, .05, .23, L.steel);
    foot(x, z, .2, .2);
    bake('ground-bollard', x, .78, z, 1.15, 5.4);
  }
  for (const x of [-19, -7, 7, 19]) bollard(x, TERRACE.z1 + .6);
  for (const z of [-9, -6.2, -3.4]) bollard(DRIVEWAY.x1 - .6, z);
  // String lights over the terrace seating: three slim posts, one sagging strand
  // between each pair, and warm bulbs hanging from it. Two bakes light the deck
  // under them, so the terrace still reads as a place to sit after dark.
  const strandZ = TERRACE.z1 - 0.5, strandY = 3.15, posts = [-19, -11.5, -4];
  for (const x of posts) { B.box(x, 0, strandZ, 0.09, strandY + 0.2, 0.09, L.steel); foot(x, strandZ, 0.2, 0.2); }
  for (let i = 0; i < posts.length - 1; i++) {
    const x0 = posts[i], x1 = posts[i + 1], segs = 10;
    const sag = t => strandY - Math.sin(t * Math.PI) * 0.62;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs, t1 = (s + 1) / segs;
      const ax = x0 + (x1 - x0) * t0, bx = x0 + (x1 - x0) * t1;
      const ay = sag(t0), by = sag(t1), mx = (ax + bx) / 2, my = (ay + by) / 2;
      const angle = Math.atan2(by - ay, bx - ax);
      B.box(mx, my, strandZ, Math.hypot(bx - ax, by - ay), 0.018, 0.018, L.paint(0x2b2a27), { rz: angle });
      B.box(mx, my - 0.13, strandZ, 0.02, 0.07, 0.02, L.steel);
      B.box(mx, my - 0.2, strandZ, 0.075, 0.09, 0.075, L.light(0xffd39a));
    }
    bake('terrace-string', (x0 + x1) / 2, strandY - 0.4, strandZ, 1.5, 7, [0, -1, 0]);
  }
  // A second strand along the seaward roof parapet: four posts on the parapet,
  // three sagging runs of warm bulbs, so the house wears a line of light above
  // the terrace after dark and the roof promenade stays walkable.
  const roofZ = HOUSE.z1 + 0.5, parapetTop = HOUSE.height + 2;
  const roofPosts = [-18, -6, 6, 18];
  for (const x of roofPosts) B.box(x, parapetTop, roofZ, 0.08, 1.15, 0.08, L.steel);
  for (let i = 0; i < roofPosts.length - 1; i++) {
    const x0 = roofPosts[i], x1 = roofPosts[i + 1], segs = 12;
    const sag = t => parapetTop + 1.1 - Math.sin(t * Math.PI) * 0.5;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs, t1 = (s + 1) / segs;
      const ax = x0 + (x1 - x0) * t0, bx = x0 + (x1 - x0) * t1;
      const ay = sag(t0), by = sag(t1), mx = (ax + bx) / 2, my = (ay + by) / 2;
      const angle = Math.atan2(by - ay, bx - ax);
      B.box(mx, my, roofZ, Math.hypot(bx - ax, by - ay), 0.016, 0.016, L.paint(0x2b2a27), { rz: angle });
      B.box(mx, my - 0.12, roofZ, 0.018, 0.06, 0.018, L.steel);
      B.box(mx, my - 0.19, roofZ, 0.07, 0.085, 0.07, L.light(0xffd39a));
    }
    bake('roof-string', (x0 + x1) / 2, parapetTop + 0.55, roofZ - 0.7, 1.25, 6, [0, -1, -0.2]);
  }
  // A static, flush sea-facing crest replaces the raised one-metre coping.
  // Its top meets the water; the submerged island edge leaves no land in front.
  B.box((POOL.x0 + POOL.x1) / 2, POOL.bed, POOL.z1 + .06, POOL.x1 - POOL.x0, POOL.water - POOL.bed, .12,
    L.paint(0x68b8c3), { shadow: false, tag: 'pool-infinity-edge' });
  // Three lamps low in the house-side wall, facing the sea, light the water at
  // night. Their glow in the water is worked out in the block and water shaders.
  for (const x of POOL_LAMPS.xs) B.box(x, POOL_LAMPS.y - .11, POOL.z0 + .015, .36, .22, .03, L.light(0xdffcff));
  // The lamps' own glow in the water is worked out in the block and water
  // shaders; on top of it a soft disc rocks on the surface after dark, breathing
  // and drifting a little, so the light on the water never sits still.
  const glowTex = paint(64, 64, P.paintGlow);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const waterGlows = POOL_LAMPS.xs.map(x => {
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.9), glowMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(x, POOL.water + 0.015, POOL.z0 + 1.35);
    disc.renderOrder = 3;
    planes.push(disc);
    return disc;
  });
  let waterClock = 0;
  animated.poolGlow = {
    update(dt, night = 0) {
      waterClock += dt;
      glowMat.opacity = night * (0.30 + 0.09 * Math.sin(waterClock * 0.7));
      waterGlows.forEach((disc, i) => {
        const s = 1 + 0.07 * Math.sin(waterClock * 0.9 + i * 2.1);
        disc.scale.set(s, s, 1);
      });
    },
  };
  // Pool access ladder: polished rails curve over the coping, with four rungs
  // visibly descending into the water. Swimming up to it climbs out here.
  const silver = L.paint(0xb3c1c3), ladderZ = POOL.z0;
  for (const x of [0.35, 1.1]) {
    B.box(x, 0, ladderZ - 0.45, 0.065, 0.9, 0.065, silver);
    B.box(x, 0.87, ladderZ - 0.08, 0.065, 0.065, 0.8, silver);
    B.box(x, -1.65, ladderZ + 0.3, 0.065, 2.52, 0.065, silver);
    B.box(x, -1.7, ladderZ + 0.2, 0.065, 0.08, 0.24, silver);
  }
  for (const y of [-0.15, -0.55, -0.95, -1.35]) B.box(0.725, y, ladderZ + 0.3, 0.78, 0.07, 0.13, silver);
  foot(0.725, ladderZ - 0.45, 0.9, 0.12);
  hot('pool', (POOL.x0 + POOL.x1) / 2, -0.3, (POOL.z0 + POOL.z1) / 2, POOL.x1 - POOL.x0, 0.6, POOL.z1 - POOL.z0);
  buildFloorPlants(B, foot);
  return { batches, obstacles, lights, lighting, hotspots, planes, animated, surfaces };
}

function ergonomicChair(B, x, z, ry) {
  // Black seat, lumbar pad and arms, with a black mesh back and headrest.
  const black = L.paint(0x1c1f21), mesh = { tex: 'chair_mesh' };
  B.at(x, 0, z, ry, () => {
    for (let i = 0; i < 5; i++) B.at(0, 0, 0, i * Math.PI * 2 / 5, () => {
      B.box(0, 0.12, 0.18, 0.07, 0.065, 0.4, L.paint(0x747b7c));
      B.box(0, 0.025, 0.36, 0.13, 0.1, 0.1, L.steel);
    });
    B.box(0, 0.15, 0, 0.09, 0.33, 0.09, L.paint(0x8d9799));
    B.box(0, 0.47, 0, 0.58, 0.1, 0.55, black);
    B.box(0, 0.53, 0.27, 0.52, 0.67, 0.065, mesh, { rx: -0.1 });
    for (const cx of [-0.28, 0.28]) B.box(cx, 0.52, 0.28, 0.04, 0.72, 0.07, L.steel, { rx: -0.1 });
    B.box(0, 0.75, 0.3, 0.42, 0.12, 0.11, black);
    B.box(0, 1.2, 0.31, 0.08, 0.14, 0.05, L.steel);
    B.box(0, 1.32, 0.33, 0.4, 0.17, 0.1, mesh);
    for (const cx of [-0.36, 0.36]) {
      B.box(cx, 0.5, 0.08, 0.045, 0.23, 0.05, L.paint(0x747b7c));
      B.box(cx, 0.72, 0, 0.09, 0.04, 0.36, black);
    }
  });
}

// A future companion outside: a lean black-and-rust Doberman with a deep chest,
// long legs, tan eyebrows/muzzle and naturally folded ears. Static, batched.