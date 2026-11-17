import { Sequelize } from 'sequelize';
import { env } from '../config/env.mjs';

const logging = false;

const createPostgresConnection = () =>
  new Sequelize(env.databaseUrl, {
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

const shouldUsePostgres =
  env.nodeEnv !== 'test' && Boolean(env.databaseUrl);

export const sequelize = shouldUsePostgres
  ? createPostgresConnection()
  : createSqliteConnection();