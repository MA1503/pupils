import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
  define: {
    // PouchDB checks process.browser to select IndexedDB adapter.
    // Vite does not provide a process shim by default → ReferenceError in browser.
    global: 'globalThis',
    'process.browser': 'true',
    'process.env': '{}',
  },
  resolve: {
    // pouchdb-browser ESM imports Node.js 'events' built-in.
    // Map it to the browser-compatible polyfill package.
    alias: {
      events: 'events/events.js'
    }
  },
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Schüler-Notizen',
        short_name: 'Pupils',
        theme_color: '#1a1a1a',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
});
