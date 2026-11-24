import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function createApiProxy() {
  return {
    '/api': {
      target: 'http://127.0.0.1:3001',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  };
}

export default defineConfig({
  server: { proxy: createApiProxy() },
  // Keep the production preview connected to the local mock API for PWA checks.
  preview: { proxy: createApiProxy() },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        id: '/',
        name: 'Circle Management',
        short_name: 'My Circle',
        description: 'Manage your personal circle, online or offline.',
        lang: 'en',
        theme_color: '#243b53',
        background_color: '#f4f7fa',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      injectManifest: {
        // Keep React Router deep links working when the network is unavailable.
        globPatterns: ['**/*.{js,css,html,svg,ico,png,webmanifest}']
      }
    })
  ]
});
