import { Router } from 'express';
import {
  addNotificationClient
} from '../notifications/notification.hub.mjs';

const heartbeatIntervalMs = 25_000;

export const notificationRouter = Router();

notificationRouter.get('/', (req, res) => {
  res.status(200);

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.flushHeaders();
  res.write('retry: 5000\n\n');
  res.write(': connected\n\n');

  const removeClient =
    addNotificationClient(res);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, heartbeatIntervalMs);

  req.once('close', () => {
    clearInterval(heartbeat);
    removeClient();
  });
});
