import { Sequelize } from 'sequelize';
import { env } from '../config/env.mjs';

const logging = false;

const createPostgresConnection = (databaseUrl) =>
  new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

const createSqliteConnection = () =>
  new Sequelize({
    dialect: 'sqlite',
    storage: env.dbStorage,
    logging
  });

const postgresUrl =
  env.testDatabaseUrl ?? env.databaseUrl;

const shouldUsePostgres = Boolean(postgresUrl);

export const sequelize = shouldUsePostgres
  ? createPostgresConnection(postgresUrl)
  : createSqliteConnection();