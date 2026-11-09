export default {
  name: '',
  skin: 'assets/terry-skin.png',
  languages: ['zh', 'en'],
  // Background music, played from its own switch in the corner: a file under
  // assets/, or 'synth' for the built-in Chinese pentatonic air; '' turns it
  // off. The page opens with it playing (a blocked autoplay waits for the first
  // tap), looking away pauses at that second, and coming back carries on.
  music: 'assets/music/theme.m4a',
  // The phone's Apple Music app lists these, in order. The corner switch plays
  // `music`; the list plays whichever track is tapped, through the same player.
  tracks: [
    { title: 'Song on the Beach', artist: 'Arcade Fire', src: 'assets/music/theme.m4a' },
  ],
  // Live weather needs a city (Open-Meteo, no key). Without one there is
  // nothing to fetch: Live weather stays clear and Live time follows the
  // visitor's own clock.
  //   { city: '上海', cityEn: 'Shanghai', latitude: 31.23, longitude: 121.47, timezone: 'Asia/Shanghai' }
  weather: { city: '石家庄', cityEn: 'Shijiazhuang', latitude: 38.04, longitude: 114.51, timezone: 'Asia/Shanghai' },
  // Both Live on every visit: the real time of day, and the city's weather.
  // Visitors can still pick a fixed sky from the corner menu.
  start: { weather: 'auto', time: 'auto' },
  // First-person drag. Flip an axis here if the eyes feel backwards; third
  // person orbiting is not affected.
  look: { invertX: false, invertY: false },
  dock: ['blog', 'about', 'mailbox', 'phone'],
  mailbox: { endpoint: '', email: 'helloneilzee@gmail.com', turnstileSitekey: '' },
  badge: true,
};
