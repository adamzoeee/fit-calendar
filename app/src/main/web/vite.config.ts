import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  base: './',
  build: {
    outDir: '../assets',
    emptyOutDir: true,
    target: 'es2020',
    modulePreload: false,
  },
});
