import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['app-icon.svg'],
      devOptions: { enabled: true },
      manifest: {
        name: 'SocialApp — Trabajo Social',
        short_name: 'SocialApp',
        description: 'Asistente offline para organizar el trabajo social en programas deportivos.',
        theme_color: '#173f35',
        background_color: '#f5f7f3',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'es-CO',
        icons: [
          { src: '/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'socialapp-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});

