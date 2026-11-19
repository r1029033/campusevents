import path from 'node:path';
import express from 'express';

const webDistPath = path.resolve(
  import.meta.dirname,
  '../../../web/dist'
);

export function serveWebApp(app) {
  app.use(express.static(webDistPath));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
}
