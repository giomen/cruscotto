import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { minify } from 'html-minifier-terser'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },

  server: {
    open: true,
  },

  plugins: [
    viteSingleFile({
      removeViteModuleLoader: true,
    }),
    {
      name: 'html-minify',
      closeBundle() {
        const path = resolve('dist/index.html')
        const html = readFileSync(path, 'utf-8')
        minify(html, {
          collapseWhitespace: true,
          removeComments: true,
          minifyCSS: false,
          minifyJS: false,
        }).then(out => writeFileSync(path, out))
      },
    },
  ],
})
