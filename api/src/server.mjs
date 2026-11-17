import { app } from './app.mjs';
import { env } from './config/env.mjs';
import { runMigrations } from './db/migrator.mjs';
import {
  startOutboxWorker,
  stopOutboxWorker
} from './workers/outbox.worker.mjs';

await runMigrations();
startOutboxWorker();

const port = env.port;

const server = app.listen(port, () => {
  console.log(
    `Campus Events API running on http://localhost:${port}/api`
  );
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received: shutting down`);

  stopOutboxWorker();

  server.close((error) => {
    if (error) {
      console.error('Failed to close the HTTP server', error);
      process.exit(1);
    }

    console.log('HTTP server stopped');
    process.exit(0);
  });
}

process.once('SIGINT', () => {
  shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  shutdown('SIGTERM');
});