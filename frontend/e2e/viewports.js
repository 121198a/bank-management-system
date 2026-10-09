// The 20 viewports required by the master kit (Phase 7), width x height in CSS pixels.
export const VIEWPORTS = [
  [240, 320], [360, 640], [375, 667], [390, 844], [393, 852], [402, 874], [412, 915],
  [430, 932], [440, 956], [540, 720], [768, 1024], [820, 1180], [1024, 1366], [1280, 800],
  [1440, 900], [1512, 982], [1728, 1117], [1920, 1080], [2560, 1440], [3840, 2160]
].map(([width, height]) => ({ width, height, name: `${width}x${height}` }));

// Pages that render without an API: sign-in flow, legal pages and the 404.
export const PUBLIC_PAGES = [
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' },
  { path: '/forgot-password', name: 'forgot-password' },
  { path: '/privacy', name: 'privacy' },
  { path: '/terms', name: 'terms' },
  { path: '/this-page-does-not-exist', name: '404' }
];
