import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Explicit, prioritised groups. Shared runtime (react, router) MUST win over the charts
        // group: recharts depends on react, and without a higher priority React's core was bundled
        // inside `charts`, so every page (incl. sign-in) downloaded the whole charting library.
        advancedChunks: {
          groups: [
            { name: 'vendor', priority: 30, test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run[\\/]router|react-is|prop-types|react-hot-toast|goober|axios|clsx)[\\/]/ },
            { name: 'charts', priority: 20, test: /node_modules[\\/](recharts|recharts-scale|react-smooth|victory-vendor|d3-[^\\/]+|internmap|decimal\.js-light|eventemitter3|tiny-invariant|lodash|fast-equals|react-transition-group|dom-helpers)[\\/]/ },
            { name: 'icons', priority: 20, test: /node_modules[\\/]lucide-react[\\/]/ }
          ]
        }
      }
    }
  }
});
