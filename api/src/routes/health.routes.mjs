import { Router } from 'express';
import { sequelize } from '../db/sequelize.mjs';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  await sequelize.authenticate();
  res.status(200).json({ status: 'ok' });
});
