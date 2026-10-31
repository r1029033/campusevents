// Creates the Express application and wires middleware, routes and error handling.

import express from 'express';
import { logger } from './config/logger.mjs';
import { sequelize } from './db/sequelize.mjs';
import { errorHandler } from './middleware/error-handler.mjs';
import { notFoundHandler } from './middleware/not-found.mjs';
import { eventRouter } from './routes/event.routes.mjs';
import { registrationRouter } from './routes/registration.routes.mjs';
import { statsRouter } from './routes/stats.routes.mjs';

export const app = express();

app.use(express.json());

app.use((req, res, next) => {
  const start = performance.now();

  res.on('finish', () => {
    logger.info('request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(performance.now() - start)
    });
  });

  next();
});

app.get('/api/health', async (_req, res) => {
  await sequelize.authenticate();
  res.status(200).json({ status: 'ok' });
});

app.use('/api/events', eventRouter);
app.use('/api/events', registrationRouter);
app.use('/api/stats', statsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
