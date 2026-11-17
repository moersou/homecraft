// The opening screen. The engine builds the world behind its dirt-and-bar
// loading screen; when that fades away this scrim comes up over the living
// world, and any key or click sends it off. Wholly the site's own: nothing here
// touches the engine, and a plain text visit never sees it.
const screen = document.getElementById('welcome');

if (screen && !document.body.classList.contains('plain') && screen.querySelector('.welcome-enter')) {
  // Hold the HUD back for as long as the opening screen is up.
  document.body.classList.add('entering');
  const enter = screen.querySelector('.welcome-enter');
  const MODIFIERS = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'];
  let dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    screen.classList.add('leaving');
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerup', onPointer);
    // world/build.js holds the camera in the air until this: the swoop down to
    // the player is what "entering" looks like. It reports `home:landed` when the
    // swoop is over, and only then do the switches come back.
    window.dispatchEvent(new Event('home:enter'));
    window.addEventListener('home:landed', () => document.body.classList.remove('entering'), { once: true });
    setTimeout(() => document.body.classList.remove('entering'), 6000);   // belt and braces
    setTimeout(() => screen.remove(), 470);
  }

  const onKey = event => { if (!MODIFIERS.includes(event.key)) dismiss(); };
  const onPointer = () => dismiss();

  function open() {
    if (dismissed || !screen.hidden) return;
    screen.hidden = false;
    enter.focus({ preventScroll: true });
    // On release, not on touch: a finger that merely lands on the screen — to
    // scroll, or by accident — should not drop the visitor into the world before
    // it is even lifted.
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerup', onPointer);
  }

  enter.addEventListener('click', dismiss);

  // The engine reports 92% and then compiles every material in the scene, which
  // is where the bar sits still the longest. Say what is happening rather than
  // leaving one caption for the whole wait.
  const bar = document.querySelector('#loading .bar i');
  const line = document.querySelector('#loading .loading-line');
  if (bar && line) {
    const watch = setInterval(() => {
      const value = parseFloat(bar.style.width || '0');
      if (value >= 90) { line.textContent = 'Compiling the light…'; clearInterval(watch); }
    }, 150);
  }

  // The engine marks #loading `done` and removes it 600 ms later; wait for that
  // so the scrim never fights the dirt screen for the same pixels.
  const loading = document.getElementById('loading');
  if (!loading) open();
  else if (loading.classList.contains('done')) setTimeout(open, 620);
  else {
    const watcher = new MutationObserver(() => {
      if (!loading.classList.contains('done')) return;
      watcher.disconnect();
      setTimeout(open, 620);
    });
    watcher.observe(loading, { attributes: true, attributeFilter: ['class'] });
  }
}
