import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      // Include root src directory for UnifiedAuthContext
      'src': path.resolve(__dirname, '../src'),
      // Explicit alias for UnifiedAuthContext to ensure it's found
      '../../context/UnifiedAuthContext': path.resolve(__dirname, './src/context/UnifiedAuthContext.tsx'),
      '../context/UnifiedAuthContext': path.resolve(__dirname, './src/context/UnifiedAuthContext.tsx'),
    },
    // Preserve symlinks to ensure proper resolution of dependencies
    preserveSymlinks: false,
    // Ensure proper file extension resolution
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  // Optimize dependencies to include root src directory
  optimizeDeps: {
    include: ['react-router-dom', 'sonner'],
  },
  base: '/shop/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
      // Ensure external dependencies are resolved correctly
      external: [],
    },
    // Include root src directory in build
    commonjsOptions: {
      include: [/node_modules/, /src/],
    },
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3000/api'),
  },
})
