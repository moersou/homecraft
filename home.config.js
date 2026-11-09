export default {
  name: '',
  skin: 'assets/terry-skin.png',
  languages: ['zh', 'en'],
  // Live weather needs a city (Open-Meteo, no key). Without one there is
  // nothing to fetch: Live weather stays clear and Live time follows the
  // visitor's own clock.
  //   { city: '上海', cityEn: 'Shanghai', latitude: 31.23, longitude: 121.47, timezone: 'Asia/Shanghai' }
  weather: null,
  // Both Live on every visit: the real time of day, and the city's weather.
  // Visitors can still pick a fixed sky from the corner menu.
  start: { weather: 'auto', time: 'auto' },
  dock: ['blog', 'about', 'mailbox', 'phone'],
  mailbox: { endpoint: '', email: 'helloneilzee@gmail.com', turnstileSitekey: '' },
  badge: true,
};
