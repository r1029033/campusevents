import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.mjs';

function secretsMatch(provided, expected) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function requireMcpApiKey(req, res, next) {
  if (!env.mcpApiKey) {
    return res.status(503).json({
      error: 'MCP API is not configured'
    });
  }

  const authorization = req.get('authorization');
  const prefix = 'Bearer ';

  if (
    !authorization?.startsWith(prefix) ||
    !secretsMatch(authorization.slice(prefix.length), env.mcpApiKey)
  ) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }

  next();
}
