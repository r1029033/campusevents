import * as statsService from '../services/stats.service.mjs';

export async function getStats(_req, res) {
  const stats = await statsService.getStats();
  res.json(stats);
}