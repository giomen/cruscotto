import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  root: 'src',                     // cartella sorgente

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000, // forza base64 per tutto (font, img)
    cssCodeSplit: false,            // un solo CSS inline
  },

  server: {
    open: true,                    // apre il browser automaticamente
  },

  plugins: [
    viteSingleFile({
      removeViteModuleLoader: true, // bundle più pulito
    }),
  ],
})