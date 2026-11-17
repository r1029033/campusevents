import { app } from './app.mjs';
import { env } from './config/env.mjs';
import { runMigrations } from './db/migrator.mjs';

await runMigrations();

const port = env.port;

app.listen(port, () => {
  console.log(
    `Campus Events API running on http://localhost:${port}/api`
  );
});