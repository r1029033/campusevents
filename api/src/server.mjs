import { app } from './app.mjs';
import { env } from './config/env.mjs';
import { runMigrations } from './db/migrator.mjs';
import {
  startMailWorker,
  stopMailWorker
} from './workers/mail.worker.mjs';
import {
  startOutboxWorker,
  stopOutboxWorker
} from './workers/outbox.worker.mjs';

await runMigrations();

const port = env.port;

const server = app.listen(port, () => {
  startOutboxWorker();
  startMailWorker();

  console.log(
    `Campus Events API running on http://localhost:${port}/api`
  );
});

let shuttingDown = false;

function closeHttpServer() {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received: shutting down`);

  stopOutboxWorker();

  try {
    await Promise.all([
      stopMailWorker(),
      closeHttpServer()
    ]);

    console.log('Campus Events API stopped');
    process.exit(0);
  } catch (error) {
    console.error('Graceful shutdown failed', error);
    process.exit(1);
  }
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});