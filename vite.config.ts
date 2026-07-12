import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Keep the defaults but drop macOS AppleDouble sidecar files, which the
    // Schumacher external drive writes next to every real file.
    exclude: [...configDefaults.exclude, '**/._*'],
  },
});
