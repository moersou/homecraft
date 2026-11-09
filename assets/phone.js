// The phone's own apps. The engine builds the phone from the contact list in
// index.html, so each app is an <li data-app="...">; this file dresses the ones
// the engine has no look for (Apple Music, Telegram, WhatsApp) and gives Apple
// Music a track list on its card. Playback is the site's own player
// (assets/music.js), so the corner switch and the list never disagree.
import config from '@config';
import { start, stop, playing, nowPlaying, onPlayerChange } from './music.js';

const tracks = config.tracks || [];
const escape = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function mount(phone) {
  let card = null;

  // The engine names the app from the contact list, so the label is the anchor.
  // Only ids the engine has no look for need a dress of their own; the rest keep
  // the engine's own coloured tile and glyph.
  const DRESSED = { 'apple music': 'music', telegram: 'telegram', whatsapp: 'whatsapp' };
  const dressOf = button => DRESSED[(button?.querySelector(':scope > span')?.textContent || '').trim().toLowerCase()] || '';
  const NAMES = ['music', 'telegram', 'whatsapp'];
  const undress = element => { for (const name of NAMES) element.classList.remove(name); };

  function paint() {
    const list = card?.querySelector('.tracks');
    if (!list) return;
    const current = nowPlaying();
    for (const button of list.querySelectorAll('button')) {
      const track = tracks[Number(button.dataset.i)];
      button.setAttribute('aria-pressed', String(playing() && current === track.src));
    }
  }

  function list() {
    const element = document.createElement('ul');
    element.className = 'tracks';
    element.innerHTML = tracks.map((track, i) => `<li><button type="button" data-i="${i}" aria-pressed="false">`
      + `<i class="state"></i><span class="title">${escape(track.title)}</span>`
      + `<span class="artist">${escape(track.artist)}</span></button></li>`).join('');
    element.addEventListener('click', event => {
      const button = event.target.closest('button[data-i]');
      if (!button) return;
      const track = tracks[Number(button.dataset.i)];
      if (playing() && nowPlaying() === track.src) stop(); else start(track.src);
    });
    return element;
  }

  // Runs one turn after the engine has filled the card, i.e. last word.
  function decorate(dress) {
    card = phone.querySelector('.card');
    if (!card) return;
    // The card is shared by every app: never carry a list across to another.
    card.querySelector('.tracks')?.remove();
    card.classList.toggle('music', dress === 'music');
    card.querySelector('.where').hidden = dress === 'music';
    const mark = card.querySelector('.mark .tile');
    if (mark) { undress(mark); if (dress) mark.classList.add(dress); }
    if (dress !== 'music') return;
    card.append(list());
    paint();
  }

  // The apps grid is rebuilt on every language switch, so watch it rather than
  // tagging the buttons once.
  const tag = () => {
    for (const button of phone.querySelectorAll('.apps .app')) {
      const tile = button.querySelector('.tile');
      if (!tile) continue;
      undress(tile);
      const dress = dressOf(button);
      if (dress) tile.classList.add(dress);
    }
  };
  new MutationObserver(tag).observe(phone, { childList: true, subtree: true });
  tag();

  phone.addEventListener('click', event => {
    const button = event.target.closest('.apps .app');
    if (button) { const dress = dressOf(button); setTimeout(() => decorate(dress), 0); return; }
    if (event.target.closest('.back, .bar')) setTimeout(() => decorate(''), 0);
  }, true);

  onPlayerChange(paint);
}

if (tracks.length && typeof document !== 'undefined') {
  // The engine builds the phone with the rest of the HUD, which happens after
  // this module runs: wait for it.
  const found = document.getElementById('phone');
  if (found) mount(found);
  else new MutationObserver((_, watcher) => {
    const phone = document.getElementById('phone');
    if (phone) { watcher.disconnect(); mount(phone); }
  }).observe(document.documentElement, { childList: true, subtree: true });
}
