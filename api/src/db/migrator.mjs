import path from 'node:path';
import { SequelizeStorage, Umzug } from 'umzug';
import { sequelize } from './sequelize.mjs';

const migrationPattern = path
  .join(import.meta.dirname, 'migrations', '*.mjs')
  .replaceAll('\\', '/');

export const migrator = new Umzug({
  migrations: {
    glob: migrationPattern
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({
    sequelize
  }),
  logger: console
});

export function runMigrations() {
  return migrator.up();
}