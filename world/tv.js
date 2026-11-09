// The television over the fireplace: click the screen, paste a YouTube or
// Bilibili link, and it plays on the screen itself.
//
// A page inside a canvas texture would be clipped to the wall, so the player is
// a DOM element laid over the canvas and mapped onto the screen's projected
// corners with a homography: it stays glued to the panel from any angle, and
// keeps its own controls. The engine is untouched; everything here is the
// world's own furniture.
import * as THREE from 'three';

const STORE = 'homecraft-tv';
const LAYOUT = { width: 1600, height: 900 };   // the player's own CSS pixel size
const REACH = 16;                              // metres: further than this, hide it

// ---------- The link ----------
// Only the shapes a viewer can actually paste from those two sites, plus a plain
// video file, are accepted; anything else gets a sentence explaining why.
export function embedFor(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  let url;
  try { url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`); } catch { return null; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const youtube = id => ({ kind: 'embed', src: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1` });

  if (host === 'youtu.be') {
    const id = url.pathname.split('/')[1];
    return id ? youtube(id) : null;
  }
  if (/(^|\.)youtube\.com$/.test(host)) {
    const short = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/);
    const id = url.searchParams.get('v') || (short && short[1]);
    return id ? youtube(id) : { kind: 'error', hint: 'This YouTube link has no video id.' };
  }
  if (/(^|\.)bilibili\.com$/.test(host) || host === 'b23.tv') {
    const bv = text.match(/BV[0-9A-Za-z]{10}/);
    if (bv) return { kind: 'embed', src: `https://player.bilibili.com/player.html?bvid=${bv[0]}&autoplay=1&high_quality=1&danmaku=0&as_wide=1` };
    const av = url.pathname.match(/\/av(\d+)/i);
    if (av) return { kind: 'embed', src: `https://player.bilibili.com/player.html?aid=${av[1]}&autoplay=1&high_quality=1&danmaku=0&as_wide=1` };
    return { kind: 'error', hint: 'Short b23.tv links cannot be opened here: open it once in a tab, then paste the bilibili.com address.' };
  }
  if (/\.(mp4|webm|ogv|m4v)$/i.test(url.pathname)) return { kind: 'file', src: url.href };
  return { kind: 'error', hint: 'Only YouTube, Bilibili or a direct .mp4 / .webm link can play here.' };
}

// ---------- The projection ----------
// Solve the 3×3 homography that carries the layout rectangle onto a quad, so a
// plain div can be glued to four projected points with one CSS transform.
export function homography(quad, width, height) {
  const from = [[0, 0], [width, 0], [0, height], [width, height]];
  const a = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i], [u, v] = quad[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  // Gaussian elimination with partial pivoting; eight unknowns, one answer.
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let row = col + 1; row < 8; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-9) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    [b[col], b[pivot]] = [b[pivot], b[col]];
    const d = a[col][col];
    for (let k = col; k < 8; k++) a[col][k] /= d;
    b[col] /= d;
    for (let row = 0; row < 8; row++) {
      if (row === col) continue;
      const f = a[row][col];
      if (!f) continue;
      for (let k = col; k < 8; k++) a[row][k] -= f * a[col][k];
      b[row] -= f * b[col];
    }
  }
  const [h11, h12, h13, h21, h22, h23, h31, h32] = b;
  return `matrix3d(${h11},${h21},0,${h31},${h12},${h22},0,${h32},0,0,1,0,${h13},${h23},0,1)`;
}

// ---------- The set ----------
export function createTv({ stage, world }) {
  const screen = world.surfaces?.tvScreen;
  if (!screen || typeof document === 'undefined') return null;
  const size = screen.geometry.parameters;
  const half = { x: size.width / 2, y: size.height / 2 };
  const corners = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => new THREE.Vector3(sx * half.x, sy * half.y, 0));

  const shell = document.createElement('div');
  shell.className = 'tv-shell';
  shell.hidden = true;
  shell.innerHTML = `
    <div class="tv-still"><b>点击银幕看视频</b><span>粘贴 YouTube / 哔哩哔哩 链接</span></div>
    <div class="tv-player" hidden></div>
    <button class="tv-change" type="button" hidden>换一个</button>`;
  const panel = document.createElement('form');
  panel.className = 'tv-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <label for="tvLink">视频链接</label>
    <input id="tvLink" name="tvLink" type="url" inputmode="url" autocomplete="off"
           placeholder="https://www.bilibili.com/video/BV… 或 https://youtu.be/…">
    <p class="tv-note"></p>
    <div class="tv-actions">
      <button type="submit">播放</button>
      <button type="button" data-tv="clear">清除</button>
      <button type="button" data-tv="close">取消</button>
    </div>`;
  document.body.append(shell, panel);
  const still = shell.querySelector('.tv-still');
  const player = shell.querySelector('.tv-player');
  const change = shell.querySelector('.tv-change');
  const note = panel.querySelector('.tv-note');
  const field = panel.querySelector('#tvLink');

  // A player is a page or a file; either way it fills the screen shell.
  function show(entry) {
    player.replaceChildren();
    if (entry.kind === 'embed') {
      const frame = document.createElement('iframe');
      frame.src = entry.src;
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.setAttribute('allowfullscreen', '');
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      player.append(frame);
    } else if (entry.kind === 'file') {
      const video = document.createElement('video');
      video.src = entry.src;
      video.autoplay = true; video.loop = true; video.controls = true; video.playsInline = true;
      video.muted = true;                       // a browser will not start unmuted on its own
      player.append(video);
    }
    still.hidden = true;
    player.hidden = false;
    change.hidden = false;
  }
  function showStill() {
    player.replaceChildren();
    player.hidden = true;
    change.hidden = true;
    still.hidden = false;
  }

  function apply(raw) {
    const entry = embedFor(raw);
    if (!entry) { note.textContent = '这不是一个链接。'; return false; }
    if (entry.kind === 'error') { note.textContent = entry.hint; return false; }
    show(entry);
    try { localStorage.setItem(STORE, raw.trim()); } catch {}
    return true;
  }

  // Whatever was playing last time comes back; a broken link leaves the invite.
  try {
    const kept = localStorage.getItem(STORE);
    if (kept) { if (!apply(kept)) showStill(); } else showStill();
  } catch { showStill(); }

  // Clicking the screen (or 换一个) opens the little paste panel.
  const open = () => {
    panel.hidden = false;
    note.textContent = '';
    try { field.value = localStorage.getItem(STORE) || ''; } catch {}
    field.focus(); field.select();
  };
  // Only the invite and the 换一个 button are ours; the player keeps its own clicks.
  shell.addEventListener('click', event => {
    if (event.target.closest('.tv-change') || event.target.closest('.tv-still')) open();
  });
  panel.addEventListener('submit', event => {
    event.preventDefault();
    if (apply(field.value)) { panel.hidden = true; note.textContent = ''; }
  });
  panel.addEventListener('click', event => {
    const act = event.target.closest('[data-tv]')?.dataset.tv;
    if (act === 'close') panel.hidden = true;
    if (act === 'clear') {
      try { localStorage.removeItem(STORE); } catch {}
      field.value = ''; note.textContent = '';
      showStill(); panel.hidden = true;
    }
  });
  field.addEventListener('keydown', event => { if (event.key === 'Escape') panel.hidden = true; });

  // ---------- Keeping the player on the panel ----------
  const point = new THREE.Vector3(), cameraSpace = new THREE.Vector3(), quad = [];
  function update() {
    const camera = stage.camera;
    const blocked = document.body.classList.contains('reading') || document.body.classList.contains('plain');
    if (blocked || !camera) { if (!shell.hidden) shell.hidden = true; return; }
    // The panel faces +x, so the viewer has to be on that side of the wall and
    // within reach; anything else would draw a screen on the back of the house.
    if (camera.position.x < screen.position.x + 0.2) { if (!shell.hidden) shell.hidden = true; return; }
    if (camera.position.distanceTo(screen.position) > REACH) { if (!shell.hidden) shell.hidden = true; return; }

    quad.length = 0;
    let behind = false;
    for (const corner of corners) {
      point.copy(corner);
      screen.localToWorld(point);
      cameraSpace.copy(point).applyMatrix4(camera.matrixWorldInverse);
      if (cameraSpace.z > -0.25) { behind = true; break; }
      point.project(camera);
      quad.push([(point.x + 1) / 2 * window.innerWidth, (1 - point.y) / 2 * window.innerHeight]);
    }
    // Off to the side, the quad would leak a sliver of player over other scenery.
    const xs = quad.map(p => p[0]), ys = quad.map(p => p[1]);
    const off = Math.max(...xs) < 8 || Math.min(...xs) > window.innerWidth - 8
      || Math.max(...ys) < 8 || Math.min(...ys) > window.innerHeight - 8;
    const transform = behind || off ? null : homography(quad, LAYOUT.width, LAYOUT.height);
    if (!transform) { if (!shell.hidden) shell.hidden = true; return; }
    if (shell.hidden) shell.hidden = false;
    shell.style.transform = transform;
  }

  shell.hidden = true;
  update();
  return { update };
}
