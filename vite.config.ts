import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pages from '@hono/vite-cloudflare-pages';

export default defineConfig({
  plugins: [react(), pages()],
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    cors: {
      origin: '*',
      credentials: true
    },
    allowedHosts: [
      'localhost',
      '.sandbox.novita.ai',
      '.genspark.ai'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request:', req.method, req.url, '→', options.target + req.url);
          });
        }
      }
    }
  }
});
