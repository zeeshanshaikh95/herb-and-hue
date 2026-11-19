import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    pool: 'threads',
    poolOptions: {
      threads: { singleThread: true },
    },
    coverage: {
      enabled: false,
    },
  },
});
