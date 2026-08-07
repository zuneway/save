import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { APP_RELEASE_NOTES, APP_VERSION } from './src/config/appVersion'

function emitVersionJson(): Plugin {
  return {
    name: 'emit-version-json',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify(
          { version: APP_VERSION, notes: APP_RELEASE_NOTES },
          null,
          2,
        )}\n`,
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const isGitHubPages = mode === 'pages'

  return {
    // GitHub project pages: https://zuneway.github.io/save/
    base: isGitHubPages ? '/save/' : '/',
    plugins: [
      react(),
      emitVersionJson(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['apple-touch-icon.png', 'vite.svg', 'version.json'],
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
          // Always hit network for version checks so clients learn about updates while open.
          navigateFallbackDenylist: [/^\/version\.json$/],
          runtimeCaching: [
            {
              urlPattern: /\/version\.json(?:\?.*)?$/i,
              handler: 'NetworkOnly',
              options: {
                cacheName: 'app-version',
              },
            },
          ],
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
