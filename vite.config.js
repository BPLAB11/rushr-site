import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Compile les îlots React (islands/) en un seul fichier JS + un fichier CSS dans assets/islands/,
// à noms fixes pour que les pages HTML puissent les charger. Ce dossier est commité : le déploiement
// reste statique, sans étape de build sur Vercel.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./islands', import.meta.url)) } },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'assets/islands',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'islands/main.jsx',
      output: {
        format: 'es',
        entryFileNames: 'islands.js',
        chunkFileNames: 'islands-[name].js',
        assetFileNames: 'islands[extname]',
      },
    },
  },
});
