import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // trip-planner/ is a stale duplicate of this project — never scan it.
    exclude: ['node_modules/**', 'trip-planner/**', '.next/**'],
  },
});
