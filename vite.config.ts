import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const isGitHubPages = mode === 'pages'

  return {
    // GitHub project pages: https://zuneway.github.io/save/
    base: isGitHubPages ? '/save/' : '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'vite.svg'],
        manifest: {
          name: '存錢系統',
          short_name: '存錢系統',
          description: '個人存錢追蹤，支援資料夾、每日隨機分配與補存入',
          theme_color: '#0f766e',
          background_color: '#f0fdfa',
          display: 'standalone',
          orientation: 'portrait-primary',
          lang: 'zh-Hant',
          start_url: '.',
          scope: '.',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    server: {
      host: true,
      port: 5173,
    },
    preview: {
      host: true,
      port: 4173,
    },
  }
})
