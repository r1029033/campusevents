// Creates the Express application and wires middleware, routes and error handling.

import express from 'express';
import { env } from './config/env.mjs';
import { errorHandler } from './middleware/error-handler.mjs';
import { notFoundHandler } from './middleware/not-found.mjs';
import { mcpRouter } from './mcp/mcp.routes.mjs';
import { requestLogger } from './middleware/request-logger.mjs';
import { eventRouter } from './routes/event.routes.mjs';
import { healthRouter } from './routes/health.routes.mjs';
import {
  notificationRouter
} from './routes/notification.routes.mjs';
import { registrationRouter } from './routes/registration.routes.mjs';
import { statsRouter } from './routes/stats.routes.mjs';
import { serveWebApp } from './web/serve-web-app.mjs';

export const app = express();

app.use(express.json());
app.use(requestLogger);

app.use('/api/health', healthRouter);
app.use('/api/events', eventRouter);
app.use('/api/events', registrationRouter);
app.use('/api/stats', statsRouter);
app.use('/api/notifications', notificationRouter);
app.use('/mcp', mcpRouter);

app.use('/api', notFoundHandler);

if (env.nodeEnv === 'production') {
  serveWebApp(app);
}

app.use(notFoundHandler);
app.use(errorHandler);
