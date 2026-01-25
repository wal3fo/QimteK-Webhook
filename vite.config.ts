import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import fs from 'node:fs';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react({
        babel: {
          plugins: [
            'react-dev-locator',
          ],
        },
      }),
      tsconfigPaths(),
      {
        name: 'html-env-transform',
        transformIndexHtml(html) {
          return html.replace(/%(\w+)%/g, (match, key) => {
            return env[key] ?? match;
          });
        },
        closeBundle() {
          const filesToReplace = ['robots.txt', 'sitemap.xml'];
          const distDir = path.resolve(process.cwd(), 'dist');

          filesToReplace.forEach(file => {
            const filePath = path.join(distDir, file);
            if (fs.existsSync(filePath)) {
              let content = fs.readFileSync(filePath, 'utf-8');
              content = content.replace(/%(\w+)%/g, (match, key) => {
                return env[key] ?? match;
              });
              fs.writeFileSync(filePath, content);
            }
          });
        }
      },
    ],
    server: {
      host: '0.0.0.0',
      port: 5000,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        }
      },
      allowedHosts: true
    }
  };
})
