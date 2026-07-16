import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/main.js', 'src/data/**', 'src/ui/**'],
      // A few points of margin below the current baseline (~95/85/98/95): catches a
      // genuine regression (new engine/state/utils code landing untested) without
      // being so tight that normal, small coverage wobbles fail CI.
      thresholds: {
        statements: 90,
        branches: 78,
        functions: 90,
        lines: 90,
      },
    },
  },
});
