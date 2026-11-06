// Build config for the Preact "islands" that run inside the live index.html.
//
// index.html is served as static files (no build step on deploy), so the bundle is
// written to assets/js/preact/islands.js and committed. Each island renders the
// same markup and CSS classes as the legacy code it replaces, so the UI is unchanged.
//
//   npm run build:islands     # rebuild after editing src/islands/**
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  publicDir: false,
  build: {
    outDir: 'assets/js/preact',
    emptyOutDir: true,
    copyPublicDir: false,
    minify: true,
    rolldownOptions: { output: { minify: true } },
    lib: {
      entry: 'src/islands/main.jsx',
      formats: ['es'],
      fileName: () => 'islands.js'
    }
  }
});
