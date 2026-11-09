// The photograph wall above the workbench. Prints are listed once here and laid
// out in rows from the top down: a row grows until its prints would be too
// small, then it is centred and the next row begins. Because every length is in
// metres and nothing is hand-placed, adding a photograph is one line in PHOTOS.
import { canvasTexture } from '@engine/world/textures.js';

// Give `width` and `height` in the file's own pixels: the aspect ratio decides
// the shape of the frame, so the layout can be measured before the image loads.
export const PHOTOS = [
  { file: 'assets/photo/poodle-in-car.jpg', width: 1356, height: 2000 },
  { file: 'assets/photo/plush-and-poodle.jpg', width: 1694, height: 1426 },
];

const TARGET = 2.4;    // metres tall: the height a row aims for
const MAX = 3.2;       // no print taller than this
const MIN = 1.45;      // and none shorter, so a row breaks before it crowds
const GAP = 0.3;       // between neighbours
const AIR = 0.25;      // extra space under a row
const FRAME = 0.08;    // oak border around every print

// Split the prints into rows, choosing for each row the count whose height lands
// closest to TARGET without going under MIN.
function rows(photos, width) {
  const out = [], queue = photos.slice();
  while (queue.length) {
    let best = null;
    for (let k = 1; k <= queue.length; k++) {
      const aspect = queue.slice(0, k).reduce((n, photo) => n + photo.width / photo.height, 0);
      const height = Math.min(MAX, (width - GAP * (k - 1)) / aspect);
      if (height < MIN) break;
      const score = Math.abs(height - TARGET);
      if (!best || score < best.score || (score === best.score && k > best.k)) best = { k, height, score };
    }
    const chosen = best || { k: 1, height: MIN };
    out.push({ photos: queue.splice(0, chosen.k), height: chosen.height });
  }
  return out;
}

// A dark mount shows until the file has loaded, so a print never flashes white.
function mount(photo) {
  const shrink = Math.min(1, 1100 / Math.max(photo.width, photo.height));
  const width = Math.round(photo.width * shrink), height = Math.round(photo.height * shrink);
  const texture = canvasTexture(width, height, (ctx) => {
    ctx.fillStyle = '#26241f';
    ctx.fillRect(0, 0, width, height);
  }, { pixelated: false });
  const image = new Image();
  image.addEventListener('load', () => {
    texture.image.getContext('2d').drawImage(image, 0, 0, width, height);
    texture.needsUpdate = true;
  }, { once: true });
  image.src = photo.file;
  return texture;
}

// `box(x, y, z, w, h, d)` takes the bottom edge; `plane(w, h, texture, x, y, z)`
// is the furnishing helper that mounts a picture flush on the panelling. Rows are
// hung upwards from `bottom`, so a new print never lands on the pegboard below.
export function hangPhotos({ photos, box, plane, x0, x1, bottom, z, frameZ }) {
  const hung = [];
  let y = bottom;
  for (const row of rows(photos, x1 - x0)) {
    const widths = row.photos.map(photo => row.height * photo.width / photo.height);
    const total = widths.reduce((sum, w) => sum + w, 0) + GAP * (widths.length - 1);
    let x = x0 + (x1 - x0 - total) / 2;
    for (let i = 0; i < row.photos.length; i++) {
      const width = widths[i], centre = x + width / 2, middle = y + row.height / 2;
      box(centre, y - FRAME, frameZ, width + FRAME * 2, row.height + FRAME * 2, 0.1);
      plane(width, row.height, mount(row.photos[i]), centre, middle, z);
      hung.push({ file: row.photos[i].file, x: +centre.toFixed(2), y: +middle.toFixed(2), width: +width.toFixed(2), height: +row.height.toFixed(2) });
      x += width + GAP;
    }
    y += row.height + GAP + AIR;
  }
  return hung;
}
