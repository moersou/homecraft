// The dog that wanders the house, built like the statue on the sandbank: a poodle
// of small apricot blocks. The engine's own dog is a Doberman; a world may hand it
// a body factory instead (`PETS.dog.body`), and this is that body.
//
// It answers the same contract as the built-in one — `{ root, update, mesh, head }`
// with `update(seconds, { moving, sleeping, rest, look, near })` — but drives its
// own, simpler poses, because the built-in rig's tables are not exported.
import * as THREE from 'three';

const APRICOT = 0xd39a63, APRICOT_LIGHT = 0xe6b98d, CREAM = 0xf3ead9;
const BLACK = 0x141417, DARK = 0x2a2420;

export function createPoodleDog() {
  const root = new THREE.Group();          // what the engine adds to the scene
  // The skeleton stays outside the scene graph, exactly as the engine's own pets do
  // it: the instance matrices are baked in this space, and the mesh already sits
  // under `root`. Attaching the skeleton to `root` as well would apply the pet's
  // world transform twice and draw the dog somewhere else entirely.
  const rig = new THREE.Group();
  const body = new THREE.Group();
  rig.add(body);
  const parts = [];
  const group = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const box = (w, h, d, color, x, y, z, parent = body) => {
    parts.push({ parent, color, local: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d)) });
  };

  // Barrel body, chest forward. Blocks are 0.1-0.2 m: at this size the facets read
  // as a clipped coat, which is what the statue does at 21 m.
  const torso = group(body, 0, .56, 0);
  box(.34, .30, .28, APRICOT, 0, 0, .04, torso);            // chest
  box(.32, .30, .26, APRICOT, 0, .01, -.18, torso);         // back
  box(.36, .26, .14, APRICOT_LIGHT, 0, -.03, .18, torso);   // shoulders
  box(.28, .22, .12, CREAM, 0, -.14, .15, torso);           // pale bib at the chest
  box(.24, .18, .12, APRICOT_LIGHT, 0, .16, -.05, torso);   // the slight rise at the withers

  // Head, ears, muzzle. Ears hang down the sides, the way the statue's do.
  const head = group(body, 0, .80, .32);
  box(.30, .28, .28, APRICOT, 0, .02, 0, head);             // skull
  box(.24, .16, .16, APRICOT_LIGHT, 0, .12, -.02, head);    // the crown of curls
  box(.16, .13, .14, CREAM, 0, -.06, .16, head);            // muzzle
  box(.075, .06, .06, BLACK, 0, -.03, .24, head);           // nose
  for (const s of [-1, 1]) {
    box(.035, .035, .02, BLACK, s * .075, .06, .15, head);  // eye
    box(.012, .012, .012, 0xffffff, s * .068, .078, .162, head);
    box(.075, .26, .13, APRICOT, s * .17, -.10, -.02, head); // ear, hanging
    box(.06, .08, .11, APRICOT_LIGHT, s * .17, -.24, -.01, head);  // its tip
  }

  // Legs: hip → knee → paw, so the gait can bend.
  const legs = [];
  for (const [x, z] of [[-.12, .18], [.12, .18], [-.12, -.20], [.12, -.20]]) {
    const hip = group(body, x, .46, z), knee = group(hip, 0, -.2, 0);
    box(.10, .24, .11, APRICOT, 0, -.11, 0, hip);
    box(.095, .16, .10, APRICOT_LIGHT, 0, -.08, 0, knee);
    box(.11, .07, .14, CREAM, 0, -.05, .02, knee);          // pale paw
    legs.push({ hip, knee, front: z > 0 });
  }

  // Tail: a puff on a short stalk.
  const tail = group(body, 0, .62, -.30);
  tail.rotation.order = 'YXZ';
  box(.07, .07, .16, APRICOT, 0, .02, -.06, tail);
  box(.11, .11, .10, APRICOT_LIGHT, 0, .03, -.16, tail);

  // One instanced mesh for every block, plus the soft contact shadow the pets have.
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), parts.length);
  mesh.name = 'poodle';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .45, 0), .95);
  parts.forEach((part, i) => mesh.setColorAt(i, new THREE.Color(part.color)));
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(.34, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .2, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = .015;
  shadow.scale.set(.85, 1.5, 1);
  root.add(mesh, shadow);       // the skeleton stays detached; the mesh rides the pet's root

  // Every pose is lifted until its lowest block clears the floor, so lying down or
  // sitting never sinks a paw into the boards.
  const matrix = new THREE.Matrix4();
  function upload() {
    rig.updateMatrixWorld(true);
    let floor = Infinity;
    parts.forEach((part, i) => {
      matrix.multiplyMatrices(part.parent.matrixWorld, part.local);
      mesh.setMatrixAt(i, matrix);
      const e = matrix.elements;
      floor = Math.min(floor, e[13] - (Math.abs(e[1]) + Math.abs(e[5]) + Math.abs(e[9])) * .5);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.position.y = .002 - floor;                 // the paws meet the floor in every pose
    rig.position.y = -floor;                 // always exactly on the floor
    shadow.position.y = .015;
    shadow.scale.set(.85, 1.5, 1);
  }

  // ---------- Poses ----------
  // Stand, lie down, sit. Enough for what the pet life asks for, and it keeps the
  // paws on the floor because the body only ever moves in whole small steps.
  const pose = { y: 0, pitch: 0, headY: 0, headPitch: 0, front: 0, back: 0 };
  let t = 0, settled = { ...pose };

  function update(dt, { moving = false, sleeping = false, rest = 'stand', look = 0, near = false } = {}) {
    t += dt;
    const goal = sleeping
      ? { y: -.22, pitch: -.06, headY: -.10, headPitch: .45, front: .9, back: -.6 }
      : rest === 'sit'
        ? { y: -.06, pitch: -.35, headY: -.02, headPitch: .30, front: .35, back: 1.1 }
        : { y: 0, pitch: 0, headY: 0, headPitch: .05, front: 0, back: 0 };
    const k = Math.min(1, dt * (moving ? 14 : 5));
    for (const key of Object.keys(goal)) settled[key] += (goal[key] - settled[key]) * k;

    body.position.y = settled.y;                    // a careful step, never a dip through the floor
    body.rotation.x = settled.pitch;
    head.position.y = .80 + settled.headY;
    head.rotation.x = settled.headPitch;
    head.rotation.y = moving ? 0 : look;

    legs.forEach(({ hip, knee, front }, i) => {
      const swing = moving ? Math.sin(t * 9 + (i === 0 || i === 3 ? 0 : Math.PI)) * .5 : 0;
      hip.rotation.x = (front ? settled.front : settled.back) + swing;
      knee.rotation.x = (front ? settled.front : settled.back) * -.4 - Math.max(0, swing) * .5;
    });
    const wag = sleeping ? 0 : moving ? Math.sin(t * 4) * .35 : near ? Math.sin(t * 12) * .5 : Math.sin(t * 1.5) * .25;
    tail.rotation.y = wag;
    // Breathing on the chest only, so the paws and head stay planted.
    torso.scale.y = 1 + Math.sin(t * 1.6) * (sleeping ? .02 : .012);
    upload();
  }

  update(0, { sleeping: true });
  return { root, update, mesh, head };
}
