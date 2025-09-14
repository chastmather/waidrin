import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./lib/__tests__/setup.ts'],
    include: ['lib/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'coverage'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'lib/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './lib'),
      '@utils': resolve(__dirname, './lib/utils'),
      '@tests': resolve(__dirname, './lib/__tests__')
    }
  }
});
