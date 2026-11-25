import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// Build séparé pour l'admin (onglet Analytics) : React + Tailwind + composants shadcn/ui.
// Sortie à noms fixes dans assets/admin/, commitée comme assets/islands/ (déploiement statique, sans build côté hébergeur).
// Séparé des îlots du site public pour que Tailwind ne touche aucune autre page.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./islands', import.meta.url)) } },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'assets/admin',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'islands/admin/main.jsx',
      output: {
        format: 'es',
        entryFileNames: 'analytics.js',
        chunkFileNames: 'analytics-[name].js',
        assetFileNames: 'analytics[extname]',
      },
    },
  },
});
