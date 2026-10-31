import { Router } from 'express';
import { getStats } from '../controllers/stats.controller.mjs';

export const statsRouter = Router();

statsRouter.get('/', getStats);