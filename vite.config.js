import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
  base: './',
  plugins: [
    // The app makes no network requests at runtime — the CSP pins connect-src
    // to 'none' — so everything it needs is already in the bundle. It shipped a
    // full manifest but no service worker, which meant it advertised itself as
    // installable while Chrome's install criteria (a fetch-handling worker)
    // went unmet, and it could not open offline despite having nothing to
    // fetch. Precaching the build closes both gaps.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      // manifest.webmanifest is maintained by hand in public/ and already
      // linked from index.html; generating a second one would ship two.
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,webmanifest}'],
        // Fonts are the bulk of the output and are content-hashed, so the
        // default 2MB cap would silently drop them from the precache.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Keeping the worker out of `vite dev` avoids serving a stale cached
        // bundle over the top of HMR.
        enabled: false,
      },
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
  },
  server: {
    port: 5173,
    open: false,
  },
});
