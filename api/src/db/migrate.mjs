import { sequelize } from './sequelize.mjs';
import { runMigrations } from './migrator.mjs';

try {
  const completed = await runMigrations();

  console.log(
    `Completed ${completed.length} database migration(s)`
  );
} finally {
  await sequelize.close();
}