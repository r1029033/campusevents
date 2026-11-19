import { Router } from 'express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { requireMcpApiKey } from '../middleware/mcp-auth.mjs';
import { createCampusEventsMcpServer } from './server.mjs';

const mcpHandler = createMcpHandler(
  createCampusEventsMcpServer
);
const nodeHandler = toNodeHandler(mcpHandler);

export const mcpRouter = Router();

mcpRouter.post('/', requireMcpApiKey, (req, res) => {
  void nodeHandler(req, res, req.body);
});

mcpRouter.all('/', (_req, res) => {
  res.set('Allow', 'POST');
  res.status(405).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed.'
    },
    id: null
  });
});

export function closeMcpHandler() {
  return mcpHandler.close();
}
