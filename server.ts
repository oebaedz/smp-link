import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createApiApp } from './server/app.ts';

async function startServer() {
  const app = createApiApp();
  const isProd = process.env.NODE_ENV === 'production';
  const port = isProd ? Number(process.env.PORT) || 3000 : 3000;

  if (!isProd) {
    let viteMiddleware: express.RequestHandler | null = null;
    const viteReady = import('vite')
      .then(({ createServer: createViteServer }) =>
        createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        })
      )
      .then((vite) => {
        viteMiddleware = vite.middlewares;
        return vite;
      });

    app.use(async (req, res, next) => {
      try {
        if (!viteMiddleware) {
          await viteReady;
        }
        if (viteMiddleware) {
          viteMiddleware(req, res, next);
          return;
        }
        next();
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/go/')) {
        next();
        return;
      }
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output tidak ditemukan.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SMPLink server berjalan pada http://0.0.0.0:${port}`);
  });
}

startServer();
