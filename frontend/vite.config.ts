import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      mode: 'development',
      base: '/',
      includeAssets: ['favicon.svg', 'jdRoll-icon-monogramme.svg', 'jdroll-icon.svg'],
      manifest: {
        name: 'JdRoll - Forum & Jeu de Rôle',
        short_name: 'JdRoll',
        description: 'Plateforme de forum et jeu de rôle par forum pour la communauté JdRoll',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: '/jdRoll-icon-monogramme.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/jdroll-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
        start_url: '/',
        scope: '/',
        lang: 'fr',
        orientation: 'portrait-primary',
      },
      strategies: 'generateSW',
      srcDir: 'src',
      filename: 'sw.js',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jdroll-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
      '/files': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
