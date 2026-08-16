/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// base MUST match the GitHub Pages repository name exactly (PRD §11.1, DEP-02).
// Assumption logged in docs/ASSUMPTIONS.md — update here if the repo is named differently.
export default defineConfig({
  base: '/kiplog-bps/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'KipLog BPS',
        short_name: 'KipLog',
        description: 'Personal Performance & Evidence Management System untuk pegawai BPS',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/kiplog-bps/',
        icons: [
          { src: 'icons.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icons.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: 'icons.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
  },
});
