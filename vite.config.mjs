import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  base: './',
  server: {
    port: 3000,
    open: '/index.html'
  }
});
