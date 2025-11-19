import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.js',
      output: {
        entryFileNames: 'wala-widget.js',
        chunkFileNames: 'wala-widget-[name].js',
        assetFileNames: 'wala-widget-[name][extname]',
      },
    },
  },
});
