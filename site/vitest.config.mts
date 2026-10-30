import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root),
    },
  },
  test: {
    environment: 'node',
    include: ['factory/tests/**/*.test.ts', 'lib/content-versioning.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
