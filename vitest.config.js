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
      exclude: [
        'src/main.js',
        'src/data/**',
        // UI modules that still have no tests. Listed individually rather than
        // as a blanket 'src/ui/**' so the gap is visible and shrinks by
        // deleting a line, not by staying invisible.
        'src/ui/candlestick.js',
        'src/ui/chart.js',
        'src/ui/glossary.js',
        'src/ui/learning.js',
        'src/ui/scenarios.js',
        'src/ui/stats.js',
        'src/ui/stock-details.js',
        'src/ui/tour.js',
      ],
      // A few points of margin below the current baseline (~94/82/97/97):
      // catches a genuine regression (new code landing untested) without being
      // so tight that normal, small wobbles fail CI.
      thresholds: {
        statements: 90,
        branches: 78,
        functions: 90,
        lines: 90,
      },
    },
  },
});
