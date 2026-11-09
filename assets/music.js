// Background music for this home: a recorded track when home.config.js `music`
// names a file, or the built-in air when it says 'synth'. Off until the visitor
// presses the corner switch, and it stops as soon as they look away, so a tab
// left open in the background is not playing to an empty room.
import config from '@config';

// A file the browser cannot decode falls back to the built-in air rather than
// leaving a switch that does nothing.
let synth = config.music === 'synth';

// ---------- The string (the 'synth' air) ----------
const hz = note => 440 * Math.pow(2, (note - 69) / 12);
// A delay line can only hold whole samples, so the loop is a few cents sharp or
// flat; averaging two neighbours shortens it by another half sample. `tuning`
// is the playback rate that puts the note back in tune.
const periodOf = (rate, note) => Math.max(2, Math.round(rate / hz(note)));
export const tuning = (rate, note) => hz(note) * (periodOf(rate, note) - 0.5) / rate;

// One pluck as raw samples, so it can be measured without a browser.
export function pluck(rate, note, seconds = 3.4) {
  const period = periodOf(rate, note);
  const length = Math.floor(rate * seconds), out = new Float32Array(length);
  const line = new Float32Array(period);
  let seed = (note * 2654435761) >>> 0;
  const random = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
  // A short excitation, low-passed: a fingertip, not a click. Brighter strings
  // (higher notes) keep more of the noise, as a shorter string would.
  const bright = 0.42 - Math.min(0.3, (note - 38) / 220);
  let prev = 0;
  for (let i = 0; i < period; i++) { line[i] = prev + (random() - prev) * bright; prev = line[i]; }
  // The loop is string enough: averaging neighbouring samples each pass is the
  // string's own low-pass, so highs die first and the tail turns wooden.
  const decay = 0.99955 - Math.max(0, note - 60) * 0.00002;
  let at = 0;
  for (let i = 0; i < length; i++) {
    const next = at + 1 === period ? 0 : at + 1;
    const value = line[at];
    line[at] = (value + line[next]) * 0.5 * decay;
    out[i] = value;
    at = next;
  }
  // Trim the ends: a soft two-millisecond attack and a short fade so a stopped
  // note never clicks.
  const attack = Math.min(length, Math.round(rate * 0.002)), release = Math.min(length, Math.round(rate * 0.3));
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const envelope = Math.min(1, i / attack, (length - i) / release);
    out[i] *= envelope;
    const magnitude = Math.abs(out[i]);
    if (magnitude > peak) peak = magnitude;
  }
  if (peak > 0) for (let i = 0; i < length; i++) out[i] *= 0.85 / peak;
  return out;
}

// ---------- The air ----------
// D pentatonic (宫商角徵羽), sixteen slow beats a phrase, with a drone underneath
// and a press-bend on two notes: the shape of a 江南 tune, not a copy of one.
const BEAT = 1.15, PHRASE = 16, LEVEL = 0.9;
const SCORE = [
  { t: 0, n: 74, v: 0.42 }, { t: 1.5, n: 71, v: 0.32 }, { t: 2.5, n: 69, v: 0.38, bend: 1 },
  { t: 4, n: 66, v: 0.4 }, { t: 5, n: 64, v: 0.28 }, { t: 6, n: 62, v: 0.36 },
  { t: 8, n: 69, v: 0.4 }, { t: 9.5, n: 74, v: 0.32 }, { t: 10.5, n: 76, v: 0.38, bend: 1 },
  { t: 12, n: 74, v: 0.3 }, { t: 13, n: 71, v: 0.28 }, { t: 14, n: 69, v: 0.36 }, { t: 15, n: 66, v: 0.24 },
  { t: 0, n: 38, v: 0.34, d: 6 }, { t: 8, n: 38, v: 0.3, d: 6 },
  { t: 4, n: 45, v: 0.22, d: 4.5 }, { t: 12, n: 45, v: 0.22, d: 4.5 },
];

let ctx = null, master = null, wet = null, strings = new Map(), timer = 0, nextAt = 0;
let audio = null, fileFade = 0, current = config.music;
let on = false, paint = () => {};
// `wanted` is what the visitor asked for; `on` is whether sound is out now.
let wanted = false;
// The phone's music app shows the same player, so it listens for these.
const listeners = new Set();
export const onPlayerChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const playing = () => on;
export const nowPlaying = () => (on && !synth ? current : null);

function impulse(seconds, decay) {
  const length = Math.floor(ctx.sampleRate * seconds), buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay) * 0.5;
  }
  return buffer;
}

function boot() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return false;
  ctx = new Audio();
  // Everything meets one soft low-pass; the room is a long, dark tail so a
  // pluck keeps ringing after the phrase has moved on.
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass'; tone.frequency.value = 3600;
  master = ctx.createGain(); master.gain.value = 0;
  const room = ctx.createConvolver(); room.buffer = impulse(2.8, 2.6);
  wet = ctx.createGain(); wet.gain.value = 0.4;
  master.connect(tone); tone.connect(ctx.destination);
  master.connect(room); room.connect(wet); wet.connect(tone);
  return true;
}

function string(note, seconds) {
  const key = `${note}:${seconds}`, cached = strings.get(key);
  if (cached) return cached;
  const samples = pluck(ctx.sampleRate, note, seconds);
  const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
  buffer.copyToChannel(samples, 0);
  const found = { buffer, tune: tuning(ctx.sampleRate, note) };
  strings.set(key, found);
  return found;
}

function voice(note, at, level, seconds, bend) {
  const source = ctx.createBufferSource(), gain = ctx.createGain();
  const { buffer, tune } = string(note, seconds);
  source.buffer = buffer;
  source.playbackRate.value = tune;
  gain.gain.value = level;
  // A press-bend: the string is played a little flat and rises into tune.
  if (bend) { source.playbackRate.setValueAtTime(tune * 0.972, at); source.playbackRate.linearRampToValueAtTime(tune, at + 0.18); }
  source.connect(gain); gain.connect(master);
  source.start(at); source.stop(at + seconds);
}

function schedule() {
  const until = nextAt + PHRASE * BEAT;
  for (const note of SCORE) voice(note.n, nextAt + note.t * BEAT, note.v, note.d || 3.4, note.bend);
  nextAt = until;
  // Queue the next phrase a second and a half before it is due.
  timer = setTimeout(schedule, Math.max(250, (until - ctx.currentTime - 1.5) * 1000));
}

function fade(to, seconds) {
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(to, now + seconds);
}

function playSynth() {
  if (!(ctx || boot())) return;
  void ctx.resume();
  fade(LEVEL, 2);
  // Suspending froze the clock, so whatever was queued still plays from there;
  // only the queue for the next phrase has to be re-armed.
  if (!timer) {
    if (!nextAt || nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.25;
    schedule();
  }
}

function pauseSynth() {
  if (!ctx) return;
  clearTimeout(timer); timer = 0;
  fade(0, 0.8);
  // Let the tail run down, then stop the clock: the phrase keeps its place.
  setTimeout(() => { if (ctx) void ctx.suspend(); }, 900);
}

// ---------- A recorded track ----------
// One element faded by its own volume, so a file needs no audio graph at all.
const FILE_LEVEL = 0.85;

function fadeFile(to, seconds, then) {
  clearInterval(fileFade);
  const steps = Math.max(1, Math.round(seconds / 0.04)), step = (to - audio.volume) / steps;
  let taken = 0;
  fileFade = setInterval(() => {
    taken++;
    audio.volume = taken >= steps ? to : Math.max(0, Math.min(1, audio.volume + step));
    if (taken >= steps) { clearInterval(fileFade); then?.(); }
  }, 40);
}

async function playFile() {
  if (!audio) {
    audio = new Audio(current);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    // A missing file, or a codec the browser lacks: fall back to the air.
    audio.addEventListener('error', () => {
      // Missing file, or a codec this browser lacks: fall back to the air.
      audio = null; synth = true;
      if (wanted) attempt();
    });
  }
  await audio.play();                    // resumes at audio.currentTime
  fadeFile(FILE_LEVEL, 2);
}

function pauseFile() {
  if (!audio) return;
  fadeFile(0, 0.8, () => audio?.pause());
}

// ---------- The switch ----------
function setOn(value) { if (on === value) return; on = value; paint(); for (const fn of listeners) fn(); }

function attempt() {
  if (!wanted || on) return;
  if (synth) { playSynth(); setOn(true); return; }
  playFile().then(() => setOn(true)).catch(armGesture);
}

// A browser refuses sound before the visitor has touched the page, so the first
// gesture retries the same autoplay rather than losing it.
function armGesture() {
  const retry = () => {
    window.removeEventListener('pointerdown', retry);
    window.removeEventListener('keydown', retry);
    attempt();
  };
  window.addEventListener('pointerdown', retry, { once: true });
  window.addEventListener('keydown', retry, { once: true });
}

export function start(source) {
  if (source && source !== current) {
    // Another track: let the old element go before taking the new one up.
    setOn(false);
    clearInterval(fileFade);
    audio?.pause();
    audio = null;
    current = source;
    synth = false;
  }
  wanted = true;
  paint();
  attempt();
}

export function stop() {
  wanted = false;
  paint();
  setOn(false);
  if (synth) pauseSynth(); else pauseFile();
}

function mount() {
  const button = document.createElement('button');
  button.id = 'musicButton';
  button.type = 'button';
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', '背景音乐');
  button.dataset.enLabel = 'Music';
  button.innerHTML = '<span><svg viewBox="0 0 16 16" aria-hidden="true">'
    + '<rect x="9" y="1" width="2" height="10"/><rect x="11" y="1" width="4" height="2"/>'
    + '<rect x="4" y="10" width="5" height="4"/><rect x="9" y="10" width="2" height="4"/></svg></span>';
  paint = () => button.setAttribute('aria-pressed', String(wanted));
  button.addEventListener('click', () => (wanted ? stop() : start()));
  // The corner switches are built by the engine at run time: wait for them.
  const corner = document.getElementById('corner');
  if (corner) corner.append(button);
  else new MutationObserver((_, watcher) => {
    const found = document.getElementById('corner');
    if (found) { found.append(button); watcher.disconnect(); }
  }).observe(document.documentElement, { childList: true, subtree: true });
  // Looking away pauses at the current second, and coming back carries on from
  // the same place; only an explicit press turns the music off.
  const away = () => { setOn(false); if (synth) pauseSynth(); else pauseFile(); };
  const back = () => attempt();
  document.addEventListener('visibilitychange', () => { if (document.hidden) away(); else back(); });
  window.addEventListener('pagehide', away);
  window.addEventListener('pageshow', back);
  // The page opens with music; if the browser blocks it, the switch stays on and
  // the first tap starts it.
  start();
}

if (config.music && typeof document !== 'undefined') mount();
