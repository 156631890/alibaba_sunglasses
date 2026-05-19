import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { generateListingWithGemini } from './src/domain/geminiListing';
import { fetchProductFromUrl } from './src/domain/productFetchServer';

export default defineConfig({
  plugins: [react(), localProductFetchApi(), localGeminiListingApi()],
  test: {
    environment: 'node',
    globals: true,
    exclude: ['node_modules', 'dist', '.worktrees', '.worktrees/**'],
  },
});

function localProductFetchApi(): Plugin {
  return {
    name: 'local-product-fetch-api',
    configureServer(server) {
      server.middlewares.use('/api/fetch-product', async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(
            JSON.stringify({
              ok: false,
              error: {
                code: 'METHOD_NOT_ALLOWED',
                message: '只支持 POST 请求。',
              },
            }),
          );
          return;
        }

        try {
          const rawBody = await readLocalRequestBody(req);
          const { status, result } = await fetchProductFromUrl(rawBody);
          res.statusCode = status;
          res.end(JSON.stringify(result));
        } catch {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              ok: false,
              error: {
                code: 'LOCAL_API_ERROR',
                message: '本地抓取接口异常，请重启 npm run dev 后重试。',
              },
            }),
          );
        }
      });
    },
  };
}

function localGeminiListingApi(): Plugin {
  return {
    name: 'local-gemini-listing-api',
    configureServer(server) {
      server.middlewares.use('/api/generate-listing', async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(
            JSON.stringify({
              ok: false,
              error: {
                code: 'METHOD_NOT_ALLOWED',
                message: '只支持 POST 请求。',
              },
            }),
          );
          return;
        }

        try {
          const rawBody = await readLocalRequestBody(req);
          const { status, result } = await generateListingWithGemini({
            body: rawBody,
            apiKey: process.env.GEMINI_API_KEY,
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          });
          res.statusCode = status;
          res.end(JSON.stringify(result));
        } catch {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              ok: false,
              error: {
                code: 'GEMINI_REQUEST_FAILED',
                message: 'Gemini 本地接口异常，请重启 npm run dev 后重试。',
              },
            }),
          );
        }
      });
    },
  };
}

function readLocalRequestBody(req: { on: (event: string, handler: (chunk?: unknown) => void) => void }) {
  return new Promise<string>((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += String(chunk);
    });
    req.on('end', () => resolve(data));
    req.on('error', (error) => reject(error));
  });
}
